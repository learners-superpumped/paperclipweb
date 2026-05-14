import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { users, subscriptions, companies, stripeEvents, balances, balanceMovements } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  isPaperclipConfigured,
  importPaperclipCompany,
  listCompanyAgents,
  approveAgent,
  resumeAgent,
  pollForFirstWorkProduct,
  createCompanyInvite,
  unarchivePaperclipCompany,
} from "@/lib/paperclip";
import { sendCompanyReadyEmail } from "@/lib/agentmail";
import { findCase } from "@/lib/cases";
import { isPaymentMockMode, isStripeTestMode } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

function sseFrame(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function makeSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "company";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session_id") ?? "";
  const caseId = searchParams.get("caseId") ?? "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(sseFrame(data)));
      }

      try {
        if (!sessionId) {
          send({ error: "Missing session_id" });
          controller.close();
          return;
        }

        // ── Mock payment session (PAPERCLIP_PAYMENT_MOCK=true) ──────────────────
        if (sessionId.startsWith("mock_") && (isPaymentMockMode() || isStripeTestMode())) {
          const slug = sessionId.slice(5);

          const [mockCompanyRow] = await db()
            .select()
            .from(companies)
            .where(eq(companies.slug, slug))
            .limit(1);

          if (!mockCompanyRow) {
            send({ error: "Company not found. Please try again." });
            controller.close();
            return;
          }

          const userId = mockCompanyRow.userId;
          const [userRow] = await db()
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          const userEmail = userRow?.email ?? "";

          // Ensure balance exists (mock-pay should have created it; this is idempotent safety).
          await db()
            .insert(balances)
            .values({ userId, dollars: "9.0000" })
            .onConflictDoNothing();

          const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";

          // Already provisioned — redirect immediately without re-running steps.
          if (mockCompanyRow.paperclipCompanyId) {
            const redirectUrl = mockCompanyRow.instanceUrl?.startsWith("http")
              ? mockCompanyRow.instanceUrl
              : `${BASE_URL}/account`;
            send({ done: true, url: redirectUrl });
            controller.close();
            return;
          }

          // Full provisioning for mock session.
          let companyName = mockCompanyRow.name ?? "My AI Company";
          const resolvedCaseId = mockCompanyRow.caseId ?? caseId ?? "";
          let paperclipCompanyId: string | undefined;
          let instanceUrl: string | undefined;

          const mockRawTemplateRef = process.env.PAPERCLIP_TEMPLATE_REF?.trim() ?? "";
          const hasValidMockRef = /^[0-9a-f]{40}$/i.test(mockRawTemplateRef);
          if (!hasValidMockRef) {
            console.warn(`[Provisioning/mock] PAPERCLIP_TEMPLATE_REF='${mockRawTemplateRef ?? ""}' is not a 40-char SHA — using inline template fallback.`);
          }
          const templateRef = hasValidMockRef ? mockRawTemplateRef! : "";

          send({ step: "import", label: "Importing company template…" });

          if (isPaperclipConfigured() && resolvedCaseId) {
            const templateSource = `learners-superpumped/paperclip-templates/${resolvedCaseId}`;

            const mockRand3 = Math.random().toString(36).slice(2, 5).toUpperCase();
            const mockPaperclipCompanyName = `${mockRand3} · ${companyName}`;

            const pcCompany = await importPaperclipCompany(templateSource, templateRef, mockPaperclipCompanyName);
            if (pcCompany?.id) {
              paperclipCompanyId = pcCompany.id;
            }
          }

          send({ step: "approve", label: "Approving CEO and team…" });
          if (paperclipCompanyId) {
            const agents = await listCompanyAgents(paperclipCompanyId);
            for (const agent of agents) {
              await approveAgent(agent.id);
              await resumeAgent(agent.id);
            }
          }

          send({ step: "heartbeat", label: "Firing first heartbeat…" });
          // heartbeat is fired by approve+resume above; poll briefly to catch fast completions
          let mockFirstHeartbeatAt: Date | null = null;
          if (paperclipCompanyId) {
            const found = await pollForFirstWorkProduct(paperclipCompanyId, 5000);
            if (found) mockFirstHeartbeatAt = new Date();
          }

          send({ step: "invite", label: "Sending you the keys…" });
          if (paperclipCompanyId) {
            const invite = await createCompanyInvite(paperclipCompanyId, "owner");
            if (invite?.url) instanceUrl = invite.url;
          }

          // Persist provisioning result.
          await db()
            .update(companies)
            .set({
              ...(paperclipCompanyId ? { paperclipCompanyId } : {}),
              ...(instanceUrl ? { instanceUrl } : {}),
              paperclipVersion: templateRef,
              ...(mockFirstHeartbeatAt ? { firstHeartbeatAt: mockFirstHeartbeatAt } : {}),
              status: "running",
              updatedAt: new Date(),
            })
            .where(eq(companies.id, mockCompanyRow.id));

          // Send company-ready email with invite URL (B.4.I3: must use paperclip engine domain).
          if (instanceUrl && userEmail) {
            try {
              await sendCompanyReadyEmail(userEmail, instanceUrl, companyName);
            } catch { /* Non-fatal */ }
          }

          const redirectUrl = instanceUrl ?? `${BASE_URL}/account`;
          send({ done: true, url: redirectUrl });
          controller.close();
          return;
        }
        // ── End mock session ────────────────────────────────────────────────────

        // Verify Stripe payment
        const stripe = getStripe();
        let stripeSession;
        try {
          stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription"],
          });
        } catch {
          send({ error: "Could not verify payment. Please contact support." });
          controller.close();
          return;
        }

        if (stripeSession.payment_status !== "paid") {
          send({ error: "Payment not completed. Please try again." });
          controller.close();
          return;
        }

        const email = stripeSession.customer_details?.email ?? "";
        if (!email) {
          send({ error: "No email found on session." });
          controller.close();
          return;
        }

        const resolvedCaseId = caseId || (stripeSession.metadata?.caseId ?? "");

        // Idempotency: check stripe_events
        const existingEvent = await db()
          .select()
          .from(stripeEvents)
          .where(eq(stripeEvents.stripeEventId, sessionId))
          .limit(1);

        // Upsert user
        const existingUsers = await db()
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId: string;
        let isNewUser = false;

        if (existingUsers[0]) {
          userId = existingUsers[0].id;
        } else {
          const [newUser] = await db()
            .insert(users)
            .values({
              email,
              plan: "pro",
              creditsBalance: 100,
              creditsLimit: 100,
            })
            .returning();
          userId = newUser.id;
          isNewUser = true;
        }

        // Fetch ALL user companies to correctly detect archived (re-subscribe) and provisioned states.
        // .limit(1) would miss archived company when webhook also created a new stub.
        const allUserCompanies = await db()
          .select()
          .from(companies)
          .where(eq(companies.userId, userId));

        const runningCompany = allUserCompanies.find(
          (c) => c.paperclipCompanyId != null && c.status === "running"
        );
        const alreadyProvisioned = !!runningCompany;
        // Use first row for legacy compat (idempotency checks below still reference it)
        const existingCompanies = allUserCompanies;

        if (!existingEvent[0]) {
          // Mark event processed (idempotency)
          await db().insert(stripeEvents).values({
            stripeEventId: sessionId,
            type: "checkout.session.completed",
          }).onConflictDoNothing();

          // Create subscription record if not exists
          const stripeSubId = typeof stripeSession.subscription === "string"
            ? stripeSession.subscription
            : (stripeSession.subscription as { id?: string } | null)?.id ?? null;

          if (stripeSubId) {
            await db()
              .insert(subscriptions)
              .values({
                userId,
                stripeSubscriptionId: stripeSubId,
                plan: "pro",
                status: "active",
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              })
              .onConflictDoNothing();
          }

          if (isNewUser) {
            await db()
              .update(users)
              .set({ plan: "pro", stripeCustomerId: stripeSession.customer as string ?? undefined })
              .where(eq(users.id, userId));
          }

          // Grant $9 LLM credit balance. Only record movement if balance was newly created —
          // prevents duplicate grant movement when webhook already granted it (e.g. authenticated checkout).
          const [newBalance] = await db()
            .insert(balances)
            .values({ userId, dollars: "9.0000" })
            .onConflictDoNothing()
            .returning();

          if (newBalance) {
            await db().insert(balanceMovements).values({
              userId,
              kind: "grant",
              dollarsDelta: "9.0000",
              reference: sessionId,
            });
          }
        }

        if (alreadyProvisioned && existingEvent[0]) {
          // Use runningCompany (has paperclipCompanyId) for idempotent re-entry
          const company = runningCompany!;
          if (company.instanceUrl) {
            // Already fully provisioned — resend existing invite URL
            send({ step: "invite", label: "Sending you the keys…" });
            send({ done: true, url: company.instanceUrl });
            controller.close();
            return;
          }
          // Company provisioned but no instanceUrl (partial failure on prior run) — create new invite
          if (company.paperclipCompanyId) {
            send({ step: "invite", label: "Sending you the keys…" });
            const BASE_URL_RETRY = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";
            const retryInvite = await createCompanyInvite(company.paperclipCompanyId, "owner");
            const retryUrl = retryInvite?.url ?? `${BASE_URL_RETRY}/account`;
            if (retryInvite?.url) {
              await db().update(companies).set({ instanceUrl: retryInvite.url, updatedAt: new Date() }).where(eq(companies.id, company.id));
            }
            send({ done: true, url: retryUrl });
            controller.close();
            return;
          }
          // paperclipCompanyId set but null somehow — fall through to full reprovisioning
        }

        // 30-day re-subscribe: restore archived company instead of creating new
        const now = new Date();
        const archivedCompany = existingCompanies.find(
          (c) => c.status === "archived" && c.paperclipCompanyId && c.deleteAfter && c.deleteAfter > now
        );
        if (archivedCompany?.paperclipCompanyId) {
          send({ step: "import", label: "Restoring your company…" });
          await unarchivePaperclipCompany(archivedCompany.paperclipCompanyId).catch(() => {});

          // Reset balance to $9
          await db()
            .update(balances)
            .set({ dollars: "9.0000", updatedAt: now })
            .where(eq(balances.userId, userId));
          await db().insert(balanceMovements).values({
            userId,
            kind: "grant",
            dollarsDelta: "9.0000",
            reference: sessionId,
          });

          await db()
            .update(companies)
            .set({ status: "running", archivedAt: null, deleteAfter: null, updatedAt: now })
            .where(eq(companies.id, archivedCompany.id));

          send({ step: "approve", label: "Approving CEO and team…" });
          send({ step: "heartbeat", label: "Firing first heartbeat…" });
          send({ step: "invite", label: "Sending you the keys…" });

          const restoredInvite = await createCompanyInvite(archivedCompany.paperclipCompanyId, "owner");
          const restoredUrl = restoredInvite?.url ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app"}/account`;

          if (restoredInvite?.url) {
            try {
              await sendCompanyReadyEmail(email, restoredInvite.url, archivedCompany.name ?? "Your AI Company");
            } catch { /* Non-fatal */ }
          }

          send({ done: true, url: restoredUrl });
          controller.close();
          return;
        }

        // Step 1: Import company template
        send({ step: "import", label: "Importing company template…" });

        let paperclipCompanyId: string | undefined;
        let instanceUrl: string | undefined;

        if (!isPaperclipConfigured()) {
          // Demo mode — skip real provisioning steps and redirect to /account
          send({ step: "approve", label: "Approving CEO and team…" });
          send({ step: "heartbeat", label: "Firing first heartbeat…" });
          send({ step: "invite", label: "Sending you the keys…" });

          let companyName = "My AI Company";
          if (resolvedCaseId) {
            const tmpl = findCase(resolvedCaseId);
            if (tmpl?.company) companyName = tmpl.company;
          }
          const slug = makeSlug(companyName);
          if (!alreadyProvisioned) {
            await db().insert(companies).values({
              userId,
              name: companyName,
              slug,
              caseId: resolvedCaseId || undefined,
              legacyMode: false,
              status: "running",
            }).onConflictDoNothing();
          }

          const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";
          send({ done: true, url: `${BASE_URL}/account` });
          controller.close();
          return;
        }

        let companyName = "My AI Company";
        if (resolvedCaseId) {
          const tmpl = findCase(resolvedCaseId);
          if (tmpl?.company) companyName = tmpl.company;
        }

        // templateSource always carries the caseId path (needed for inline fallback).
        const templateSource = resolvedCaseId
          ? `learners-superpumped/paperclip-templates/${resolvedCaseId}`
          : "";

        const rawTemplateRef = process.env.PAPERCLIP_TEMPLATE_REF?.trim() ?? "";
        const hasValidRef = /^[0-9a-f]{40}$/i.test(rawTemplateRef);
        if (process.env.PAPERCLIP_TEMPLATE_REF && !hasValidRef) {
          // B.2.I3: PAPERCLIP_TEMPLATE_REF is set but is not a valid 40-char SHA (e.g. a branch name
          // or a value with trailing whitespace). Hard-fail to prevent silent template drift.
          send({ error: `PAPERCLIP_TEMPLATE_REF ('${rawTemplateRef}') must be a 40-char commit SHA, not a branch name. Update the Vercel env var to prevent template drift.` });
          controller.close();
          return;
        }
        // If not set, use empty ref → buildGithubTreeUrl fails → importPaperclipCompany falls
        // back to inline import using the caseId. This is acceptable for dev/demo deployments.
        const templateRef = hasValidRef ? rawTemplateRef : "";

        // Prepend random 3-char prefix to avoid issue_prefix duplicate constraint on paperclip engine.
        // Keep clean companyName for DB storage.
        const rand3 = Math.random().toString(36).slice(2, 5).toUpperCase();
        const paperclipCompanyName = `${rand3} · ${companyName}`;

        const pcCompany = await importPaperclipCompany(templateSource, templateRef, paperclipCompanyName);

        if (pcCompany?.id) {
          paperclipCompanyId = pcCompany.id;
        }

        // Step 2: Approve agents
        send({ step: "approve", label: "Approving CEO and team…" });
        if (paperclipCompanyId) {
          const agents = await listCompanyAgents(paperclipCompanyId);
          for (const agent of agents) {
            await approveAgent(agent.id);
            await resumeAgent(agent.id);
          }
        }

        // Step 3: Heartbeat — fired by approve+resume above; poll briefly for fast completions
        send({ step: "heartbeat", label: "Firing first heartbeat…" });
        let firstHeartbeatAt: Date | null = null;
        if (paperclipCompanyId) {
          const found = await pollForFirstWorkProduct(paperclipCompanyId, 5000);
          if (found) firstHeartbeatAt = new Date();
        }

        // Step 4: Create invite
        send({ step: "invite", label: "Sending you the keys…" });
        if (paperclipCompanyId) {
          const invite = await createCompanyInvite(paperclipCompanyId, "owner");
          if (invite?.url) instanceUrl = invite.url;
        }

        // Persist company record — update provisioning stub (from webhook) or insert fresh row.
        // Use the provisioning stub if available; otherwise insert new.
        const provisioningStub = allUserCompanies.find((c) => !c.paperclipCompanyId && c.status === "provisioning");
        const targetCompany = provisioningStub ?? null;
        const slug = makeSlug(companyName);
        if (targetCompany) {
          await db()
            .update(companies)
            .set({
              name: companyName,
              caseId: resolvedCaseId || targetCompany.caseId || undefined,
              ...(paperclipCompanyId ? { paperclipCompanyId } : {}),
              ...(instanceUrl ? { instanceUrl } : {}),
              paperclipVersion: templateRef,
              ...(firstHeartbeatAt ? { firstHeartbeatAt } : {}),
              status: paperclipCompanyId ? "running" : targetCompany.status,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, targetCompany.id));
        } else {
          await db().insert(companies).values({
            userId,
            name: companyName,
            slug,
            caseId: resolvedCaseId || undefined,
            paperclipCompanyId,
            instanceUrl,
            paperclipVersion: templateRef,
            ...(firstHeartbeatAt ? { firstHeartbeatAt } : {}),
            legacyMode: false,
            status: paperclipCompanyId ? "running" : "provisioning",
          }).onConflictDoNothing();
        }

        // Send company ready email (best-effort)
        if (instanceUrl) {
          try {
            await sendCompanyReadyEmail(email, instanceUrl, companyName);
          } catch {
            // Non-fatal
          }
        }

        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";
        const redirectUrl = instanceUrl ?? `${BASE_URL}/account`;
        send({ done: true, url: redirectUrl });
        controller.close();
      } catch (err) {
        console.error("[provisioning/stream] error:", err);
        try {
          controller.enqueue(encoder.encode(sseFrame({ error: "Provisioning failed. Please contact support." })));
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

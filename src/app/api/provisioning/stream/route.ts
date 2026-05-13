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
        if (sessionId.startsWith("mock_") && process.env.PAPERCLIP_PAYMENT_MOCK === "true") {
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

          // Already provisioned — fast-confirm all 4 steps then redirect.
          if (mockCompanyRow.paperclipCompanyId) {
            send({ step: "import", label: "Importing company template…" });
            send({ step: "approve", label: "Approving CEO and team…" });
            send({ step: "heartbeat", label: "Firing first heartbeat…" });
            send({ step: "invite", label: "Sending you the keys…" });
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

          send({ step: "import", label: "Importing company template…" });

          if (isPaperclipConfigured() && resolvedCaseId) {
            const templateSource = `learners-superpumped/paperclip-templates/${resolvedCaseId}`;
            const rawTemplateRef = process.env.PAPERCLIP_TEMPLATE_REF;
            if (!rawTemplateRef) {
              console.error("[Provisioning/mock] PAPERCLIP_TEMPLATE_REF not set — falling back to 'main'.");
            } else if (!/^[0-9a-f]{40}$/i.test(rawTemplateRef)) {
              console.warn(`[Provisioning/mock] PAPERCLIP_TEMPLATE_REF='${rawTemplateRef}' is not a 40-char SHA.`);
            }
            const templateRef = rawTemplateRef ?? "main";

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
          if (paperclipCompanyId) {
            await pollForFirstWorkProduct(paperclipCompanyId, 20000);
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

        // Check if company already provisioned (idempotent re-entry)
        const existingCompanies = await db()
          .select()
          .from(companies)
          .where(eq(companies.userId, userId))
          .limit(1);

        const alreadyProvisioned = existingCompanies[0]?.paperclipCompanyId != null;

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

          // Grant $9 LLM credit balance
          await db()
            .insert(balances)
            .values({ userId, dollars: "9.0000" })
            .onConflictDoNothing();

          await db().insert(balanceMovements).values({
            userId,
            kind: "grant",
            dollarsDelta: "9.0000",
            reference: sessionId,
          });
        }

        if (alreadyProvisioned && existingEvent[0]) {
          // Already fully provisioned — just resend invite
          const company = existingCompanies[0];
          if (company.instanceUrl) {
            send({ step: "invite", label: "Sending you the keys…" });
            send({ done: true, url: company.instanceUrl });
            controller.close();
            return;
          }
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

        const templateSource = resolvedCaseId
          ? `learners-superpumped/paperclip-templates/${resolvedCaseId}`
          : "";

        const rawTemplateRef = process.env.PAPERCLIP_TEMPLATE_REF;
        if (!rawTemplateRef) {
          console.error("[Provisioning] PAPERCLIP_TEMPLATE_REF is not set — falling back to 'main'. Set this to a pinned commit SHA to prevent template drift.");
        } else if (!/^[0-9a-f]{40}$/i.test(rawTemplateRef)) {
          console.warn(`[Provisioning] PAPERCLIP_TEMPLATE_REF='${rawTemplateRef}' is not a 40-char SHA. Template drift risk: any push to this ref changes what subscribers receive.`);
        }
        const templateRef = rawTemplateRef ?? "main";

        // Prepend random 3-char prefix to avoid issue_prefix duplicate constraint on paperclip engine.
        // Keep clean companyName for DB storage.
        const rand3 = Math.random().toString(36).slice(2, 5).toUpperCase();
        const paperclipCompanyName = `${rand3} · ${companyName}`;

        const pcCompany = await importPaperclipCompany(templateSource || "", templateRef, paperclipCompanyName);

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

        // Step 3: Heartbeat
        send({ step: "heartbeat", label: "Firing first heartbeat…" });
        if (paperclipCompanyId) {
          await pollForFirstWorkProduct(paperclipCompanyId, 20000);
        }

        // Step 4: Create invite
        send({ step: "invite", label: "Sending you the keys…" });
        if (paperclipCompanyId) {
          const invite = await createCompanyInvite(paperclipCompanyId, "owner");
          if (invite?.url) instanceUrl = invite.url;
        }

        // Persist company record
        const slug = makeSlug(companyName);
        if (alreadyProvisioned && existingCompanies[0]) {
          if (paperclipCompanyId) {
            await db()
              .update(companies)
              .set({
                paperclipCompanyId,
                instanceUrl,
                status: "running",
                updatedAt: new Date(),
              })
              .where(eq(companies.id, existingCompanies[0].id));
          }
        } else {
          await db().insert(companies).values({
            userId,
            name: companyName,
            slug,
            caseId: resolvedCaseId || undefined,
            paperclipCompanyId,
            instanceUrl,
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

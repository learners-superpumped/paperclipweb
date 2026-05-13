import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  companies,
  mockCompanies,
  subscriptions,
  creditTransactions,
  tasks,
} from "@/db/schema";
import { findCase } from "@/lib/cases";
import { sendEmail } from "@/lib/agentmail";
import { PLANS } from "@/lib/constants";
import {
  isPaperclipConfigured,
  createPaperclipCompany,
  createCompanyInvite,
} from "@/lib/paperclip";

const Body = z.object({ caseId: z.string().nullable().optional() });

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "company";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

type MockPayload = {
  employees?: unknown;
  sampleTask?: {
    title?: string;
    description?: string;
    presetResult?: string;
  };
};

function parseMockPayload(payloadJson: string | null): MockPayload | null {
  if (!payloadJson) return null;
  try {
    return JSON.parse(payloadJson) as MockPayload;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: "no_user" }, { status: 404 });
  }

  // mock_companies 마지막 row 가져와 이관. 없으면 caseId 로 minimal company 생성.
  let mock: typeof mockCompanies.$inferSelect | undefined;
  if (parsed.caseId) {
    const rows = await db()
      .select()
      .from(mockCompanies)
      .where(and(eq(mockCompanies.userId, user.id), eq(mockCompanies.caseId, parsed.caseId), isNull(mockCompanies.migratedToCompanyId)))
      .orderBy(desc(mockCompanies.createdAt))
      .limit(1);
    mock = rows[0];
  } else {
    const rows = await db()
      .select()
      .from(mockCompanies)
      .where(and(eq(mockCompanies.userId, user.id), isNull(mockCompanies.migratedToCompanyId)))
      .orderBy(desc(mockCompanies.createdAt))
      .limit(1);
    mock = rows[0];
  }

  const caseId = mock?.caseId ?? parsed.caseId ?? "ai-blog-seo";
  const template = findCase(caseId);
  const companyName = mock?.companyName ?? template?.company ?? "AI Company";
  const mockPayload = parseMockPayload(mock?.payloadJson ?? null);
  const employeesJson =
    mockPayload
      ? mockPayload.employees ?? null
      : template?.employees ?? null;
  const firstTask = mockPayload?.sampleTask ?? template?.sampleTask;
  const firstTaskResult =
    mock?.firstTaskResult ?? firstTask?.presetResult ?? template?.sampleTask.presetResult;

  // idempotency — 이미 active subscription + company 있으면 그 slug 반환 (재요청 시 중복 spawn 회피).
  const [activeSub] = await db()
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")))
    .limit(1);
  if (activeSub) {
    const [existing] = await db()
      .select()
      .from(companies)
      .where(eq(companies.userId, user.id))
      .orderBy(desc(companies.createdAt))
      .limit(1);
    if (existing?.slug) {
      // Always update company with latest mock/template data regardless of mock presence
      const nextEmployeesJson = employeesJson ? JSON.stringify(employeesJson) : null;

      // spec 13/14: paperclipCompanyId 가 아직 null 이면 paperclip engine 에 진짜 company + invite 생성.
      // (idempotent 재호출 시에도 진짜 인스턴스 누락된 옛 row 회복)
      let nextPaperclipCompanyId: string | null = existing.paperclipCompanyId;
      let nextInstanceUrl: string | null = existing.instanceUrl;
      if (!existing.paperclipCompanyId && isPaperclipConfigured()) {
        const pcCompany = await createPaperclipCompany(
          companyName,
          `paperclipweb subscriber instance for ${user.email ?? user.id}`,
        );
        if (pcCompany?.id) {
          nextPaperclipCompanyId = pcCompany.id;
          const invite = await createCompanyInvite(pcCompany.id, "owner");
          nextInstanceUrl = invite?.url ?? nextInstanceUrl;
        }
      }

      await db()
        .update(companies)
        .set({
          name: companyName,
          caseId,
          status: "running",
          mockMode: false,
          updatedAt: new Date(),
          ...(nextEmployeesJson ? { employeesJson: nextEmployeesJson } : {}),
          ...(nextPaperclipCompanyId ? { paperclipCompanyId: nextPaperclipCompanyId } : {}),
          ...(nextInstanceUrl ? { instanceUrl: nextInstanceUrl } : {}),
        })
        .where(eq(companies.id, existing.id));

      // Ensure first task is present (from mock or template fallback)
      if (firstTask?.title && firstTaskResult) {
        const [existingTask] = await db()
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.companyId, existing.id), eq(tasks.title, firstTask.title)))
          .limit(1);
        if (!existingTask) {
          await db().insert(tasks).values({
            companyId: existing.id,
            userId: user.id,
            title: firstTask.title,
            inputPrompt: firstTask.description ?? firstTask.title,
            status: "done",
            resultMarkdown: firstTaskResult,
            creditsUsed: 0,
            isMock: true,
            finishedAt: new Date(),
          });
        }
      }

      if (mock) {
        await db()
          .update(mockCompanies)
          .set({ migratedToCompanyId: existing.id })
          .where(eq(mockCompanies.id, mock.id));
      }
      // Ensure stripeCustomerId is set on idempotent path too (8.M2).
      if (!user.stripeCustomerId) {
        await db()
          .update(users)
          .set({ stripeCustomerId: `cus_mock_${existing.id.slice(0, 8)}` })
          .where(eq(users.id, user.id));
      }
      return NextResponse.json({ ok: true, slug: existing.slug, idempotent: true });
    }
  }

  const slug = makeSlug(companyName);

  // spec 13/14: 결제 성공 시 paperclip engine 에 진짜 company 생성 + SSO invite 발급.
  // 그래야 사용자가 자기 paperclip UI 전체를 그대로 사용 가능. instanceUrl 은 invite URL.
  let paperclipCompanyId: string | null = null;
  let instanceUrl: string = `/i/${slug}`;
  if (isPaperclipConfigured()) {
    const pcCompany = await createPaperclipCompany(
      companyName,
      `paperclipweb subscriber instance for ${user.email ?? user.id}`,
    );
    if (pcCompany?.id) {
      paperclipCompanyId = pcCompany.id;
      const invite = await createCompanyInvite(pcCompany.id, "owner");
      if (invite?.url) instanceUrl = invite.url;
    }
  }

  const [company] = await db()
    .insert(companies)
    .values({
      userId: user.id,
      name: companyName,
      slug,
      caseId,
      employeesJson: employeesJson ? JSON.stringify(employeesJson) : null,
      status: "running",
      mockMode: false,
      paperclipCompanyId,
      instanceUrl,
    })
    .returning();

  await db()
    .insert(subscriptions)
    .values({
      userId: user.id,
      plan: "pro",
      status: "active",
      stripeSubscriptionId: `mock_sub_${company.id.slice(0, 8)}`,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

  await db()
    .update(users)
    .set({
      plan: "pro",
      creditsBalance: PLANS.pro.credits,
      creditsLimit: PLANS.pro.credits,
      // Set a mock Stripe customer ID so QA can confirm post-payment state (8.M2).
      // Only set if not already present (preserve real IDs from test-mode flows).
      ...(user.stripeCustomerId ? {} : { stripeCustomerId: `cus_mock_${company.id.slice(0, 8)}` }),
    })
    .where(eq(users.id, user.id));

  await db().insert(creditTransactions).values({
    userId: user.id,
    companyId: company.id,
    amount: PLANS.pro.credits,
    type: "subscription",
    description: "Pro subscription (mock) — 100 actions credited",
  });

  if (firstTask?.title && firstTaskResult) {
    await db().insert(tasks).values({
      companyId: company.id,
      userId: user.id,
      title: firstTask.title,
      inputPrompt: firstTask.description ?? firstTask.title,
      status: "done",
      resultMarkdown: firstTaskResult,
      creditsUsed: 0,
      isMock: true,
      finishedAt: new Date(),
    });
  }

  if (mock) {
    await db()
      .update(mockCompanies)
      .set({ migratedToCompanyId: company.id })
      .where(eq(mockCompanies.id, mock.id));
  }

  // Welcome mail (best-effort)
  const firstName = (user.name ?? "friend").split(" ")[0];
  try {
    await sendEmail({
      to: email,
      subject: `[Paperclip] ${companyName} instance is ready`,
      body: `
        <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;">
          <h2 style="color:#0F172A;font-size:22px;">Hi ${firstName} — ${companyName} is live</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">Payment went through and your instance is up. Everything you built in the mock (company, team, first task) carried over as-is.</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">100 actions are credited. When you need more, top up $10 for 50 actions from the dashboard.</p>
          <a href="https://usepaperclip.app/i/${slug}" style="display:inline-block;background:#4F46E5;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Open my company</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[checkout] welcome mail failed", err);
  }

  return NextResponse.json({ ok: true, slug });
}

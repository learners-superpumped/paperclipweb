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
      await db()
        .update(companies)
        .set({
          name: companyName,
          caseId,
          status: "running",
          mockMode: false,
          updatedAt: new Date(),
          ...(nextEmployeesJson ? { employeesJson: nextEmployeesJson } : {}),
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
      return NextResponse.json({ ok: true, slug: existing.slug, idempotent: true });
    }
  }

  const slug = makeSlug(companyName);

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
      instanceUrl: `/i/${slug}`,
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

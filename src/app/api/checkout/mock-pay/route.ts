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
  balances,
  balanceMovements,
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

  // Idempotency — 이미 active subscription + company 있으면 그 slug 반환.
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
      // Ensure balances row exists (idempotent).
      await db()
        .insert(balances)
        .values({ userId: user.id, dollars: "9.0000" })
        .onConflictDoNothing();
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
      // Provisioning is handled by /api/provisioning/stream (mock session).
      // paperclipCompanyId and real instanceUrl are filled in there.
      status: "provisioning",
      mockMode: false,
      paperclipCompanyId: null,
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

  // Grant $9 LLM credit balance — architecture § 2 step 1.
  await db()
    .insert(balances)
    .values({ userId: user.id, dollars: "9.0000" })
    .onConflictDoNothing();

  await db().insert(balanceMovements).values({
    userId: user.id,
    kind: "grant",
    dollarsDelta: "9.0000",
    reference: `mock_pay_${company.id}`,
  });

  await db()
    .update(users)
    .set({
      plan: "pro",
      creditsBalance: PLANS.pro.credits,
      creditsLimit: PLANS.pro.credits,
      ...(user.stripeCustomerId ? {} : { stripeCustomerId: `cus_mock_${company.id.slice(0, 8)}` }),
    })
    .where(eq(users.id, user.id));

  await db().insert(creditTransactions).values({
    userId: user.id,
    companyId: company.id,
    amount: PLANS.pro.credits,
    type: "subscription",
    description: "Pro subscription (mock) — $9 LLM credit",
  });

  if (mock) {
    await db()
      .update(mockCompanies)
      .set({ migratedToCompanyId: company.id })
      .where(eq(mockCompanies.id, mock.id));
  }

  // Payment-received email (no company URL — provisioning/stream sends company-ready email
  // with the real paperclip invite URL once provisioning completes).
  const firstName = (user.name ?? "friend").split(" ")[0];
  try {
    await sendEmail({
      to: email,
      subject: `[Paperclip] Payment received — setting up ${companyName}`,
      body: `
        <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;">
          <h2 style="color:#0F172A;font-size:22px;">Hi ${firstName} — payment received</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;">We're setting up your ${companyName} instance now. You'll get another email with the link to your company once it's ready — usually under a minute.</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;">$9 LLM credit is included. Need more? Top up $10 for $4.50 additional credit from your account.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[checkout] payment-received mail failed", err);
  }

  return NextResponse.json({ ok: true, slug });
}

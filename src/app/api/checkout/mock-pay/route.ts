import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, subscriptions, balances, balanceMovements, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { findCase } from "@/lib/cases";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

// QA endpoint: creates a test user + unprovisioned company stub.
// Returns mock_<slug> sessionId for use with /api/provisioning/stream.
// Protected: STRIPE_TEST_MODE=true AND CRON_SECRET bearer required.
// Live mode (both flags off) returns 404.
//
// Checklist: A.4.F1, A.4.F2, A.4.F3, A.4.M1, A.4.M2
// Usage:
//   1. POST here with { email, caseId } + Authorization: Bearer <CRON_SECRET>
//   2. GET /api/provisioning/stream?session_id=mock_<slug>&caseId=<caseId>
//   3. Wait for { done: true, url: <instanceUrl> }
//   4. DB SELECT companies WHERE slug=<slug> → check instanceUrl host, firstHeartbeatAt
//   5. Check AgentMail inbox at <email> for invite email
export async function POST(req: Request) {
  const blocked = await guardQaTestRoute();
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({})) as { email?: string; caseId?: string };
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const caseId = typeof body.caseId === "string" ? body.caseId.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Upsert user
  let userId: string;
  const existingUsers = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUsers[0]) {
    userId = existingUsers[0].id;
  } else {
    const [newUser] = await db()
      .insert(users)
      .values({ email, plan: "pro", creditsBalance: 100, creditsLimit: 100 })
      .returning();
    userId = newUser.id;
  }

  // Create subscription stub
  const mockSubId = `mock_sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db()
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: mockSubId,
      plan: "pro",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  // Grant balance
  await db()
    .insert(balances)
    .values({ userId, dollars: "9.0000" })
    .onConflictDoNothing();

  await db().insert(balanceMovements).values({
    userId,
    kind: "grant",
    dollarsDelta: "9.0000",
    reference: mockSubId,
  });

  // Create company stub (no paperclipCompanyId — stream will provision it)
  const tmpl = caseId ? findCase(caseId) : null;
  const companyName = tmpl?.company ?? "My AI Company";
  const slug = `mock-${Math.random().toString(36).slice(2, 8)}`;

  await db().insert(companies).values({
    userId,
    name: companyName,
    slug,
    caseId: caseId || undefined,
    legacyMode: false,
    status: "provisioning",
  });

  return NextResponse.json({
    ok: true,
    slug,
    sessionId: `mock_${slug}`,
    streamUrl: `/api/provisioning/stream?session_id=mock_${slug}&caseId=${caseId}`,
    note: "Stream streamUrl to provision. Check DB companies.firstHeartbeatAt and companies.instanceUrl after done.",
  });
}

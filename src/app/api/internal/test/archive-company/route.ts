import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions, companies } from "@/db/schema";
import { PLAN_CREDITS } from "@/lib/stripe";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

// QA-only endpoint: archive a user's company with 30-day retention window,
// simulating the post-cancellation state needed to test re-subscribe flow.
// live 모드 (STRIPE_TEST_MODE=false AND PAPERCLIP_PAYMENT_MOCK=false) 에서는 404.
export async function POST(req: Request) {
  const blocked = await guardQaTestRoute();
  if (blocked) return blocked;

  const { email } = (await req.json()) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const freeCredits = PLAN_CREDITS.free;
  const now = new Date();
  const deleteAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Downgrade user to free
  await db()
    .update(users)
    .set({
      plan: "free",
      creditsBalance: Math.min(user.creditsBalance, freeCredits.limit),
      creditsLimit: freeCredits.limit,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  // Mark subscriptions cancelled
  await db()
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")));

  // Archive running/provisioning companies with 30-day delete window.
  // Two separate updates since Drizzle OR requires sql`` — keep it explicit.
  const r1 = await db()
    .update(companies)
    .set({ status: "archived", archivedAt: now, deleteAfter, updatedAt: now })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "running")))
    .returning({ id: companies.id });

  const r2 = await db()
    .update(companies)
    .set({ status: "archived", archivedAt: now, deleteAfter, updatedAt: now })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "provisioning")))
    .returning({ id: companies.id });

  return NextResponse.json({
    ok: true,
    archivedCount: r1.length + r2.length,
    deleteAfter: deleteAfter.toISOString(),
  });
}

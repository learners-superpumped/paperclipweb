import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, subscriptions, companies } from "@/db/schema";
import { PLAN_CREDITS } from "@/lib/stripe";
import { sendSubscriptionCancelledEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

// QA-only endpoint: simulate subscription cancellation for a user.
// Protected by CRON_SECRET bearer token.
export async function POST(req: Request) {
  const headersList = await headers();
  const auth = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email } = (await req.json()) as { email?: string };
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const freeCredits = PLAN_CREDITS.free;
  const previousPlan = user.plan;

  // Downgrade user to free
  await db()
    .update(users)
    .set({
      plan: "free",
      creditsBalance: Math.min(user.creditsBalance, freeCredits.limit),
      creditsLimit: freeCredits.limit,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Mark subscriptions cancelled
  await db()
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")));

  // Stop running companies
  await db()
    .update(companies)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "running")));

  await db()
    .update(companies)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "provisioning")));

  // Send notification email (best-effort)
  let emailSent = false;
  try {
    await sendSubscriptionCancelledEmail(user.email, user.name ?? undefined);
    emailSent = true;
  } catch (err) {
    console.error("[test/cancel-subscription] email failed", err);
  }

  return NextResponse.json({ ok: true, previousPlan, emailSent });
}

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, subscriptions, companies } from "@/db/schema";
import { getStripe, PLAN_CREDITS } from "@/lib/stripe";
import { sendSubscriptionCancelledEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const [activeSub] = await db()
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")))
    .limit(1);

  if (!activeSub) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
  }

  const isMockSub = activeSub.stripeSubscriptionId?.startsWith("mock_");

  if (isMockSub) {
    // Mock/test mode: cancel locally without Stripe API
    const freeCredits = PLAN_CREDITS.free;

    await db()
      .update(users)
      .set({
        plan: "free",
        creditsBalance: Math.min(user.creditsBalance, freeCredits.limit),
        creditsLimit: freeCredits.limit,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await db()
      .update(subscriptions)
      .set({ status: "canceled" })
      .where(eq(subscriptions.id, activeSub.id));

    await db()
      .update(companies)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(and(eq(companies.userId, user.id), eq(companies.status, "running")));

    await db()
      .update(companies)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(and(eq(companies.userId, user.id), eq(companies.status, "provisioning")));

    try {
      await sendSubscriptionCancelledEmail(user.email, user.name ?? undefined);
    } catch (err) {
      console.error("[subscription/cancel] email failed (mock)", err);
    }

    return NextResponse.json({
      ok: true,
      canceledAt: new Date().toISOString(),
      mode: "mock",
      message: "Your subscription has been cancelled. Your data is kept for 30 days.",
    });
  }

  // Real Stripe subscription cancel
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(activeSub.stripeSubscriptionId!);
    // DB cleanup + email is handled by webhook customer.subscription.deleted
    return NextResponse.json({
      ok: true,
      canceledAt: new Date().toISOString(),
      mode: "stripe",
      message: "Your subscription has been cancelled. Your data is kept for 30 days.",
    });
  } catch (err) {
    console.error("[subscription/cancel] Stripe cancel failed", err);
    return NextResponse.json({ error: "cancel_failed", detail: String(err) }, { status: 500 });
  }
}

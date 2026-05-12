import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, subscriptions, companies } from "@/db/schema";
import { sendSubscriptionCancelledEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

// QA endpoint: simulate subscription cancellation for the current session user.
// Authenticated via session (no CRON_SECRET needed).
// Allows QA to verify 11.F5 (cancel flow: DB state, company stop, email).
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const previousPlan = user.plan;

  // Downgrade to free (0 credits on cancellation)
  await db()
    .update(users)
    .set({
      plan: "free",
      creditsBalance: 0,
      creditsLimit: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Mark active subscriptions as canceled
  await db()
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")));

  // Stop all running/provisioning companies
  await db()
    .update(companies)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "running")));

  await db()
    .update(companies)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(and(eq(companies.userId, user.id), eq(companies.status, "provisioning")));

  let emailSent = false;
  try {
    await sendSubscriptionCancelledEmail(user.email, user.name ?? undefined);
    emailSent = true;
  } catch (err) {
    console.error("[test/cancel-my-subscription] email failed", err);
  }

  return NextResponse.json({ ok: true, previousPlan, emailSent, plan: "free" });
}

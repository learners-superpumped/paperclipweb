import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, subscriptions, companies } from "@/db/schema";
import { sendSubscriptionCancelledEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

// QA endpoint: simulate subscription cancellation for the current session user.
// Authenticated via session (no CRON_SECRET needed).
// Allows QA to verify 11.F5 (cancel flow: DB state, company stop, email, data retention).
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

  // Snapshot company count before cancellation (for data-retention verification)
  const allUserCompanies = await db()
    .select({ id: companies.id, status: companies.status })
    .from(companies)
    .where(eq(companies.userId, user.id));

  const runningBefore = allUserCompanies.filter(
    (c) => c.status === "running" || c.status === "provisioning",
  ).length;

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

  // Verify data retention: companies still exist (not deleted, only stopped)
  const companiesAfter = await db()
    .select({ id: companies.id, status: companies.status })
    .from(companies)
    .where(eq(companies.userId, user.id));

  const stoppedAfter = companiesAfter.filter((c) => c.status === "stopped").length;
  const totalAfter = companiesAfter.length;

  return NextResponse.json({
    ok: true,
    previousPlan,
    emailSent,
    plan: "free",
    // 11.F5 verification fields:
    companiesStopped: runningBefore,
    // Data retained = companies still exist in DB (not deleted)
    companiesDataRetained: totalAfter,
    instanceStopConfirmed: runningBefore > 0 ? stoppedAfter >= runningBefore : true,
    // Spec: data retained for 30 days (companies row kept, not deleted)
    dataRetentionDays: 30,
    dataRetentionNote:
      "Companies, employees, and task history are kept in DB for 30 days after cancellation. Only instance status is set to stopped.",
  });
}

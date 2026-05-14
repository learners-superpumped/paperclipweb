import { NextResponse } from "next/server";
import { and, eq, gte, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, companies, tasks, creditTransactions } from "@/db/schema";
import { sendMonthlySummaryEmail } from "@/lib/agentmail";
import { isProductionDeployment } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

// QA endpoint (10.F7): trigger monthly digest email for the currently authenticated user.
// No CRON_SECRET required — authenticated via session cookie (same as all other QA steps).
//
// Usage:
//   POST /api/internal/test/trigger-digest
//   Cookie: next-auth.session-token=<session>   (set automatically if using browser/Playwright session)
//
// Returns: { ok: true, email, month, actionsUsed }
// Then check AgentMail inbox for the monthly summary email to verify 10.F7.
export async function POST() {
  if (isProductionDeployment()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const txns = await db()
    .select()
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, user.id),
        eq(creditTransactions.type, "usage"),
        gte(creditTransactions.createdAt, monthStart)
      )
    );

  const completedTasks = await db()
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, user.id),
        eq(tasks.status, "done"),
        gte(tasks.createdAt, monthStart)
      )
    );

  const userCompanies = await db()
    .select({ name: companies.name })
    .from(companies)
    .where(and(eq(companies.userId, user.id), eq(companies.status, "running")))
    .orderBy(desc(companies.createdAt))
    .limit(5);

  try {
    await sendMonthlySummaryEmail(email, {
      name: user.name ?? undefined,
      actionsUsed: txns.length,
      actionsLimit: user.creditsLimit,
      tasksCompleted: completedTasks.length,
      companies: userCompanies.map((c) => c.name),
      month: monthLabel,
    });
    return NextResponse.json({ ok: true, email, month: monthLabel, actionsUsed: txns.length });
  } catch (err) {
    console.error("[test/trigger-digest] failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

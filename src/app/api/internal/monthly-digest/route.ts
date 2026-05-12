import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, gte, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, companies, tasks, creditTransactions } from "@/db/schema";
import { sendMonthlySummaryEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

// Trigger monthly summary email for a user (or all users).
// Protected by CRON_SECRET bearer token.
// QA: POST with { email } to trigger for a specific user.
// Cron: POST with {} to trigger for all active users.
export async function POST(req: Request) {
  const headersList = await headers();
  const auth = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: string };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  let targetUsers: Array<{ id: string; email: string; name: string | null; creditsBalance: number; creditsLimit: number; plan: string }> = [];

  if (body.email) {
    const [u] = await db().select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!u) return NextResponse.json({ error: "user not found" }, { status: 404 });
    targetUsers = [u];
  } else {
    // All non-free users
    targetUsers = await db()
      .select()
      .from(users)
      .where(eq(users.plan, "pro"));
  }

  const results: { email: string; sent: boolean; error?: string }[] = [];

  for (const user of targetUsers) {
    try {
      // Actions used this month
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
      const actionsUsed = txns.length;

      // Tasks completed this month
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

      // Active company names
      const userCompanies = await db()
        .select({ name: companies.name })
        .from(companies)
        .where(and(eq(companies.userId, user.id), eq(companies.status, "running")))
        .orderBy(desc(companies.createdAt))
        .limit(5);

      await sendMonthlySummaryEmail(user.email, {
        name: user.name ?? undefined,
        actionsUsed,
        actionsLimit: user.creditsLimit,
        tasksCompleted: completedTasks.length,
        companies: userCompanies.map(c => c.name),
        month: monthLabel,
      });

      results.push({ email: user.email, sent: true });
    } catch (err) {
      console.error("[monthly-digest] failed for", user.email, err);
      results.push({ email: user.email, sent: false, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, balances, balanceMovements, costEventsMirror, users } from "@/db/schema";
import { eq, isNotNull, sql } from "drizzle-orm";
import { syncCompanyBudget, pollForFirstWorkProduct } from "@/lib/paperclip";
import { sendCreditLowEmail } from "@/lib/agentmail";

export const dynamic = "force-dynamic";

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL ?? "";
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY ?? "";

async function fetchFinanceEvents(
  companyId: string,
  since?: Date
): Promise<Array<{
  id: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  dollars?: number;
  agentSlug?: string;
  occurredAt?: string;
}>> {
  if (!PAPERCLIP_API_URL) return [];
  const sinceParam = since ? `&since=${since.toISOString()}` : "";
  const url = `${PAPERCLIP_API_URL.replace(/\/+$/, "")}/api/companies/${companyId}/costs/finance-events?limit=200${sinceParam}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PAPERCLIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const activeCompanies = await db()
    .select({
      id: companies.id,
      userId: companies.userId,
      paperclipCompanyId: companies.paperclipCompanyId,
      firstHeartbeatAt: companies.firstHeartbeatAt,
      status: companies.status,
    })
    .from(companies)
    .where(isNotNull(companies.paperclipCompanyId));

  let processed = 0;

  for (const company of activeCompanies) {
    if (!company.paperclipCompanyId) continue;

    // Find the most recent imported event for this company
    const [lastEvent] = await db()
      .select({ importedAt: costEventsMirror.importedAt })
      .from(costEventsMirror)
      .where(eq(costEventsMirror.paperclipCompanyId, company.paperclipCompanyId))
      .orderBy(sql`${costEventsMirror.importedAt} DESC`)
      .limit(1);

    const since = lastEvent?.importedAt ?? undefined;
    const events = await fetchFinanceEvents(company.paperclipCompanyId, since);

    let totalNewSpend = 0;

    // Insert new events; use .returning() to count only actually-inserted rows,
    // preventing double-spend when concurrent cron runs see overlapping event windows.
    for (const ev of events) {
      if (!ev.id) continue;
      const evDollars = ev.dollars ?? 0;
      try {
        const inserted = await db()
          .insert(costEventsMirror)
          .values({
            userId: company.userId,
            paperclipEventId: ev.id,
            paperclipCompanyId: company.paperclipCompanyId,
            model: ev.model ?? null,
            inputTokens: ev.inputTokens ?? null,
            outputTokens: ev.outputTokens ?? null,
            dollars: String(evDollars),
            agentSlug: ev.agentSlug ?? null,
            occurredAt: ev.occurredAt ? new Date(ev.occurredAt) : null,
          })
          .onConflictDoNothing()
          .returning({ id: costEventsMirror.id });
        if (inserted.length > 0) {
          totalNewSpend += evDollars;
        }
      } catch {
        // unexpected error — skip event
      }
    }

    if (totalNewSpend > 0) {
      // Deduct balance inside a transaction with a transaction-level advisory lock
      // so concurrent cost-poller runs for the same user cannot interleave.
      await db().transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${company.userId}))`);
        await tx
          .update(balances)
          .set({
            dollars: sql`GREATEST(${balances.dollars} - ${String(totalNewSpend)}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(balances.userId, company.userId));
        await tx.insert(balanceMovements).values({
          userId: company.userId,
          kind: "spend",
          dollarsDelta: String(-totalNewSpend),
          reference: company.paperclipCompanyId,
        });
      });
    }

    // Retroactively record first_heartbeat_at for running companies that don't have it yet
    if (!company.firstHeartbeatAt && company.status === "running" && company.paperclipCompanyId) {
      const found = await pollForFirstWorkProduct(company.paperclipCompanyId, 500);
      if (found) {
        await db()
          .update(companies)
          .set({ firstHeartbeatAt: new Date(), updatedAt: new Date() })
          .where(eq(companies.id, company.id));
      }
    }

    // Get updated balance and sync budget
    const [balance] = await db()
      .select()
      .from(balances)
      .where(eq(balances.userId, company.userId))
      .limit(1);

    if (balance) {
      const dollars = parseFloat(balance.dollars);
      await syncCompanyBudget(company.paperclipCompanyId, dollars).catch(() => {});

      // Low balance alert at $2
      if (dollars <= 2 && totalNewSpend > 0) {
        const [user] = await db()
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, company.userId))
          .limit(1);
        if (user?.email) {
          await sendCreditLowEmail(user.email, dollars, 9).catch(() => {});
        }
      }
    }

    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}

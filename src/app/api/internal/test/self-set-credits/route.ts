import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { isPaymentMockMode, isProductionDeployment, isStripeTestMode } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

// QA endpoint: set the CURRENT SESSION USER's credit balance.
// Authenticated via session cookie — no CRON_SECRET required.
//
// PRODUCTION SAFETY: this route is hidden on production deployments. In
// non-production live mode (not test/mock), only DECREASING the balance
// is allowed (balance must be ≤ current). This prevents users from inflating
// their own credits for free. In test/mock mode any value is accepted.
//
// Use cases:
//   10.F4 — set balance to 19 (below 20 threshold), check low-balance banner
//   10.F5 — set balance to 0, then run task → blocked with top-up CTA
//   10.F6 — set balance to 0, then call mock-topup → balance reflects +50
export async function POST(req: Request) {
  if (isProductionDeployment()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { balance } = (await req.json().catch(() => ({}))) as { balance?: number };
  if (typeof balance !== "number" || balance < 0) {
    return NextResponse.json({ error: "balance (number >= 0) required" }, { status: 400 });
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const isMock = isPaymentMockMode();
  const isTest = isStripeTestMode();

  // In live mode: only allow decreasing (prevent free-credit inflation)
  if (!isMock && !isTest && balance > user.creditsBalance) {
    return NextResponse.json(
      { error: "cannot_increase_credits", message: "In live mode only credit decreases are allowed via this endpoint." },
      { status: 403 },
    );
  }

  const [updated] = await db()
    .update(users)
    .set({ creditsBalance: balance, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ creditsBalance: users.creditsBalance, creditsLimit: users.creditsLimit });

  await db().insert(creditTransactions).values({
    userId: user.id,
    amount: balance - user.creditsBalance,
    type: "grant",
    description: `[QA self-set] credits → ${balance}`,
  });

  return NextResponse.json({
    ok: true,
    creditsBalance: updated?.creditsBalance ?? balance,
    creditsLimit: updated?.creditsLimit ?? user.creditsLimit,
    previousBalance: user.creditsBalance,
  });
}

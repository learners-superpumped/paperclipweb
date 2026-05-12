import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";

export const dynamic = "force-dynamic";

// QA endpoint: set the CURRENT SESSION USER's credit balance to a specific value.
// No CRON_SECRET required — authenticated via session cookie (same as all QA steps).
// Protected by mode flag: returns 404 in live mode (PAPERCLIP_PAYMENT_MOCK=false AND STRIPE_TEST_MODE=false).
//
// Usage:
//   POST /api/internal/test/self-set-credits
//   Cookie: next-auth.session-token=<session>
//   Body: { "balance": 19 }
//
// Use cases:
//   10.F4 — set balance to 19 (below 20), then navigate to /i/<slug> and assert low-balance-banner
//   10.F5 — set balance to 0, then try to run task → should be blocked
//   10.F6 — set balance to 0, then topup → balance should increase by 50
export async function POST(req: Request) {
  const isMock = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  const isTest = process.env.STRIPE_TEST_MODE === "true";
  if (!isMock && !isTest) {
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

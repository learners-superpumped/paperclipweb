import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

// QA-only endpoint: set a user's credits balance to an arbitrary value.
// live 모드 (STRIPE_TEST_MODE=false AND PAPERCLIP_PAYMENT_MOCK=false) 에서는 404 — endpoint 존재 자체 숨김.
// test/mock 모드 + CRON_SECRET bearer 둘 다 만족할 때만 동작.
export async function POST(req: Request) {
  const blocked = await guardQaTestRoute();
  if (blocked) return blocked;

  const { email, balance } = (await req.json()) as { email?: string; balance?: number };
  if (!email || typeof balance !== "number") {
    return NextResponse.json({ error: "email and balance (number) required" }, { status: 400 });
  }

  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
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
    description: `[QA test] set credits to ${balance}`,
  });

  return NextResponse.json({ ok: true, creditsBalance: updated?.creditsBalance ?? balance, creditsLimit: updated?.creditsLimit ?? user.creditsLimit });
}

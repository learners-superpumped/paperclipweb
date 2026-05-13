import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";
import { TOPUP } from "@/lib/constants";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) return NextResponse.json({ error: "no_user" }, { status: 404 });

  const isMock = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  const isTest = process.env.STRIPE_TEST_MODE === "true";

  // In live mode: only allow when balance is at 0 (prevents free-credit abuse).
  // In test/mock mode: always allow (QA needs to top up repeatedly).
  if (!isMock && !isTest && user.creditsBalance > 0) {
    return NextResponse.json(
      {
        error: "topup_not_needed",
        message: `Balance is ${user.creditsBalance}. Mock topup is only available when balance reaches 0.`,
        creditsBalance: user.creditsBalance,
      },
      { status: 400 },
    );
  }

  const [updatedUser] = await db()
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${TOPUP.credits}`,
    })
    .where(eq(users.id, user.id))
    .returning({
      creditsBalance: users.creditsBalance,
      creditsLimit: users.creditsLimit,
    });

  await db().insert(creditTransactions).values({
    userId: user.id,
    amount: TOPUP.credits,
    type: "topup",
    description: `$${TOPUP.price} top up = ${TOPUP.credits} actions (${isTest ? "test" : isMock ? "mock" : "qa-zero-balance"})`,
  });

  return NextResponse.json({
    ok: true,
    creditsBalance: updatedUser?.creditsBalance ?? user.creditsBalance + TOPUP.credits,
    creditsLimit: updatedUser?.creditsLimit ?? user.creditsLimit,
  });
}

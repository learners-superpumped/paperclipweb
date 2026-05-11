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

  await db()
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${TOPUP.credits}`,
      creditsLimit: sql`${users.creditsLimit} + ${TOPUP.credits}`,
    })
    .where(eq(users.id, user.id));

  await db().insert(creditTransactions).values({
    userId: user.id,
    amount: TOPUP.credits,
    type: "topup",
    description: `$${TOPUP.price} 충전 = ${TOPUP.credits} 액션 (mock)`,
  });

  return NextResponse.json({ ok: true });
}

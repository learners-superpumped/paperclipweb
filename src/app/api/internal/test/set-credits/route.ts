import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";

export const dynamic = "force-dynamic";

// QA-only endpoint: set a user's credits balance to an arbitrary value.
// Protected by CRON_SECRET bearer token.
export async function POST(req: Request) {
  const headersList = await headers();
  const auth = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

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

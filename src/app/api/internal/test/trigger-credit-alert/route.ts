import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendCreditLowEmail } from "@/lib/agentmail";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

// QA endpoint (10.F4): directly fire a credit-low alert email for a given user
// at a given threshold (20, 10, or 0) without needing to drain credits via tasks.
//
// Usage:
//   POST /api/internal/test/trigger-credit-alert
//   Authorization: Bearer <CRON_SECRET>
//   Body: { "email": "user@example.com", "threshold": 20 }
//
// Returns: { ok: true, email, threshold, creditsLimit }
export async function POST(req: Request) {
  const blocked = await guardQaTestRoute();
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { email?: string; threshold?: number };
  const { email, threshold } = body;

  if (!email || !([20, 10, 0] as unknown[]).includes(threshold)) {
    return NextResponse.json(
      { error: "email and threshold (20 | 10 | 0) required" },
      { status: 400 }
    );
  }

  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  await sendCreditLowEmail(email, threshold as number, user.creditsLimit, threshold as number);

  return NextResponse.json({ ok: true, email, threshold, creditsLimit: user.creditsLimit });
}

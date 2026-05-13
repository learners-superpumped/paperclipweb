import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendCreditLowEmail } from "@/lib/agentmail";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

// QA endpoint (10.F4): fire a credit-low alert email.
//
// Auth options:
//   A. CRON_SECRET bearer + test/mock mode → any email (existing behavior)
//   B. Session cookie only → fires for the current user's own email (no mode gate)
//
// Option B allows verify to test the credit alert email in production without CRON_SECRET.
// Sending yourself a notification email is harmless.
//
// Usage (option B):
//   POST /api/internal/test/trigger-credit-alert
//   Cookie: <session>
//   Body: { "threshold": 20 }      ← email param ignored; fires for session user
//
// Usage (option A):
//   POST /api/internal/test/trigger-credit-alert
//   Authorization: Bearer <CRON_SECRET>
//   Body: { "email": "user@example.com", "threshold": 20 }
export async function POST(req: Request) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  const body = (await req.json().catch(() => ({}))) as { email?: string; threshold?: number };
  const { threshold } = body;

  if (!([20, 10, 0] as unknown[]).includes(threshold)) {
    return NextResponse.json(
      { error: "threshold (20 | 10 | 0) required" },
      { status: 400 },
    );
  }

  if (hasCronSecret) {
    // Option A: CRON_SECRET + mode gate + any email
    const blocked = await guardQaTestRoute();
    if (blocked) return blocked;

    const { email } = body;
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

    await sendCreditLowEmail(email, threshold as number, user.creditsLimit, threshold as number);
    return NextResponse.json({ ok: true, email, threshold, creditsLimit: user.creditsLimit });
  }

  // Option B: session auth — fires for current user only, no mode gate
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const [user] = await db().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  await sendCreditLowEmail(email, threshold as number, user.creditsLimit, threshold as number);
  return NextResponse.json({ ok: true, email, threshold, creditsLimit: user.creditsLimit });
}

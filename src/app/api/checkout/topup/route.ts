import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, creditTransactions, balances, balanceMovements } from "@/db/schema";
import { TOPUP } from "@/lib/constants";
import { ensurePrice } from "@/lib/stripe-ensure";
import { getStripe } from "@/lib/stripe";

// spec.md § 6: single top-up option — $10 / 50 actions, applied instantly.
// In test/mock mode: credits are added directly (no Stripe round-trip needed).
// In live mode: creates a Stripe Checkout Session (payment mode) for the topup.
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isMock = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  const isTest = process.env.STRIPE_TEST_MODE === "true";

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return NextResponse.json({ error: "no_user" }, { status: 404 });

  // Test / mock mode: apply credits directly (same as mock-topup).
  if (isMock || isTest) {
    const topupDollars = "4.5000";

    // B.5.I4: update dollar balance (same path as live Stripe webhook).
    await db()
      .insert(balances)
      .values({ userId: user.id, dollars: topupDollars })
      .onConflictDoUpdate({
        target: balances.userId,
        set: {
          dollars: sql`${balances.dollars} + ${topupDollars}`,
          updatedAt: new Date(),
        },
      });

    await db().insert(balanceMovements).values({
      userId: user.id,
      kind: "topup",
      dollarsDelta: topupDollars,
      reference: `test-topup-${Date.now()}`,
    });

    await db().insert(creditTransactions).values({
      userId: user.id,
      amount: TOPUP.credits,
      type: "topup",
      description: `$${TOPUP.price} top up = ${TOPUP.credits} actions (${isTest ? "test" : "mock"})`,
    });

    const [bal] = await db().select().from(balances).where(eq(balances.userId, user.id)).limit(1);

    return NextResponse.json({
      ok: true,
      dollars: parseFloat(bal?.dollars ?? topupDollars).toFixed(2),
    });
  }

  // Live mode: Stripe Checkout Session (payment, not subscription).
  const priceId = await ensurePrice({
    lookupKey: "paperclipweb_topup_10",
    unitAmount: 1000, // $10
    productName: "Paperclip Top Up — 50 actions",
    interval: undefined, // one-time payment
  });

  const stripe = getStripe();
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/account?topup=success`,
    cancel_url: `${base}/account`,
    metadata: {
      userId: user.id,
      type: "topup",
      topupPackage: "standard",
      credits: String(TOPUP.credits),
      price: String(TOPUP.price),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

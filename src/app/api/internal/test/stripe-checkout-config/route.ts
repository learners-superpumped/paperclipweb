import { NextResponse } from "next/server";
import { ensurePrice } from "@/lib/stripe-ensure";
import { getStripe } from "@/lib/stripe";
import { guardQaTestRoute } from "@/lib/qa-test-guard";

export const dynamic = "force-dynamic";

const PAPERCLIP_PRO_MONTHLY_LOOKUP = "paperclipweb_pro_monthly";
const EXPECTED_AMOUNT = 2900; // $29/month
const EXPECTED_INTERVAL = "month";

// QA endpoint: verifies Stripe checkout config is correct.
// live 모드 (STRIPE_TEST_MODE=false AND PAPERCLIP_PAYMENT_MOCK=false) 에서는 404.
// test/mock 모드 + CRON_SECRET bearer 둘 다 만족할 때만 동작.
export async function GET() {
  const blocked = await guardQaTestRoute();
  if (blocked) return blocked;

  const isMock = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  const isTestMode = process.env.STRIPE_TEST_MODE === "true";
  const hasTestKey = !!process.env.STRIPE_SECRET_KEY_TEST;

  const config = {
    lookupKey: PAPERCLIP_PRO_MONTHLY_LOOKUP,
    expectedAmount: EXPECTED_AMOUNT,
    expectedInterval: EXPECTED_INTERVAL,
    isMockMode: isMock,
    isTestMode,
  };

  // Verify price config via Stripe API (test mode required)
  if (isTestMode && hasTestKey) {
    try {
      const priceId = await ensurePrice({
        lookupKey: PAPERCLIP_PRO_MONTHLY_LOOKUP,
        unitAmount: EXPECTED_AMOUNT,
        productName: "Paperclip Pro",
        interval: "month",
      });

      const stripe = getStripe();
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product as string);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app";
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout/cancel?reason=declined`,
        metadata: { qa_test: "true" },
      });

      return NextResponse.json({
        ok: true,
        config,
        stripeVerified: true,
        priceId,
        priceAmount: price.unit_amount,
        priceInterval: (price.recurring as { interval: string } | null)?.interval,
        productName: product.name,
        checkoutUrl: checkoutSession.url,
        checkoutSessionId: checkoutSession.id,
        amountMatch: price.unit_amount === EXPECTED_AMOUNT,
        intervalMatch: (price.recurring as { interval: string } | null)?.interval === EXPECTED_INTERVAL,
      });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        config,
        stripeVerified: false,
        error: String(err),
      }, { status: 500 });
    }
  }

  // Mock-only mode: return config for assertion without hitting Stripe
  return NextResponse.json({
    ok: true,
    config,
    stripeVerified: false,
    mockOnly: true,
    note: "Set STRIPE_TEST_MODE=true + STRIPE_SECRET_KEY_TEST to get full Stripe verification.",
  });
}

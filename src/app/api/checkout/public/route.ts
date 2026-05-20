import { NextResponse } from "next/server";
import { ensurePrice } from "@/lib/stripe-ensure";
import { getStripe } from "@/lib/stripe";
import { isPaymentMockMode, isStripeTestMode } from "@/lib/runtime-mode";

const PAPERCLIP_PRO_MONTHLY_LOOKUP = "paperclipweb_pro_monthly";

export async function POST(req: Request) {
  const isStripeTestActive =
    isStripeTestMode() && !!process.env.STRIPE_SECRET_KEY_TEST;
  const isMock = isPaymentMockMode() && !isStripeTestActive;
  if (isMock) {
    return NextResponse.json({ url: "/checkout/mock-success" });
  }

  const { caseId } = (await req.json().catch(() => ({}))) as { caseId?: string };

  const priceId = await ensurePrice({
    lookupKey: PAPERCLIP_PRO_MONTHLY_LOOKUP,
    unitAmount: 2900,
    productName: "Paperclip Pro",
    interval: "month",
  });

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://usepaperclip.app";
  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    currency: "usd",
    adaptive_pricing: { enabled: false },
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE_URL}/provisioning?session_id={CHECKOUT_SESSION_ID}&caseId=${caseId ?? ""}`,
    cancel_url: `${BASE_URL}/checkout/cancel?reason=declined`,
    metadata: {
      caseId: caseId ?? "",
      plan: "pro",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

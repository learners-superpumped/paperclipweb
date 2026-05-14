import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensurePrice } from "@/lib/stripe-ensure";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isPaymentMockMode, isStripeTestMode } from "@/lib/runtime-mode";

const PAPERCLIP_PRO_MONTHLY_LOOKUP = "paperclipweb_pro_monthly";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // STRIPE_TEST_MODE + STRIPE_SECRET_KEY_TEST takes priority over PAPERCLIP_PAYMENT_MOCK:
  // lets QA verify run real Stripe test checkout even when mock mode is on.
  const isStripeTestActive =
    isStripeTestMode() && !!process.env.STRIPE_SECRET_KEY_TEST;
  const isMock = isPaymentMockMode() && !isStripeTestActive;
  if (isMock) {
    return NextResponse.json({ url: "/checkout/mock-success" });
  }

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "no_user" }, { status: 404 });
  }

  const { caseId } = (await req.json().catch(() => ({}))) as { caseId?: string };

  // Ensure price exists (idempotent)
  const priceId = await ensurePrice({
    lookupKey: PAPERCLIP_PRO_MONTHLY_LOOKUP,
    unitAmount: 2900, // $29/month
    productName: "Paperclip Pro",
    interval: "month",
  });

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    currency: "usd",
    adaptive_pricing: { enabled: false },
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app"}/provisioning?session_id={CHECKOUT_SESSION_ID}&caseId=${caseId ?? ""}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app"}/checkout/cancel?reason=declined`,
    metadata: {
      userId: user.id,
      caseId: caseId ?? "",
      // spec.md ## 6 pricing: 단일 플랜 Pro $29/mo / 100 actions / 1 instance.
      // 이 unitAmount(2900) 와 webhook 의 PLAN_PRICES.pro($29), PLAN_CREDITS.pro(100) 가 일치.
      plan: "pro",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

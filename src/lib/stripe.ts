import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Plan to Stripe Price ID mapping
export function getPriceId(plan: "starter" | "pro"): string {
  if (plan === "starter") {
    return process.env.STRIPE_STARTER_PRICE_ID || "price_starter_monthly";
  }
  return process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly";
}

// Top-up package price IDs
export const TOPUP_PRICE_IDS: Record<string, { credits: number; price: number }> = {
  small: { credits: 500, price: 1250 },   // $12.50
  medium: { credits: 2000, price: 4000 },  // $40.00
  large: { credits: 5000, price: 8750 },   // $87.50
};

// Plan credit limits
export const PLAN_CREDITS: Record<string, { balance: number; limit: number }> = {
  free: { balance: 100, limit: 100 },
  starter: { balance: 1000, limit: 1000 },
  pro: { balance: 3000, limit: 3000 },
};

import Stripe from "stripe";
import { isStripeTestMode } from "@/lib/runtime-mode";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const isTest = isStripeTestMode();
    const key = isTest
      ? process.env.STRIPE_SECRET_KEY_TEST
      : process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        isTest
          ? "STRIPE_SECRET_KEY_TEST is not set (STRIPE_TEST_MODE=true)"
          : "STRIPE_SECRET_KEY is not set"
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Plan to Stripe Price ID mapping. spec.md ## 6: 단일 플랜 Pro 만.
export function getPriceId(_plan: "pro"): string {
  return process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly";
}

// Top-up package price IDs
export const TOPUP_PRICE_IDS: Record<string, { credits: number; price: number }> = {
  small: { credits: 500, price: 1250 },   // $12.50
  medium: { credits: 2000, price: 4000 },  // $40.00
  large: { credits: 5000, price: 8750 },   // $87.50
};

// Plan credit limits — spec.md ## 6 pricing SoT.
// free: 가입 직후 (한도 0, mock 온보딩만 가능).
// pro: $29/mo / 100 actions / 1 instance.
export const PLAN_CREDITS: Record<string, { balance: number; limit: number }> = {
  free: { balance: 0, limit: 0 },
  pro: { balance: 100, limit: 100 },
};

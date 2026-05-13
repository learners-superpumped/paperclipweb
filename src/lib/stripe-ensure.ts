import { getStripe } from "./stripe";

/**
 * lookup_key 기반 price idempotent 생성.
 * STRIPE_TEST_MODE=true 면 test 키 사용.
 * 이미 존재하면 그대로 반환, 없으면 product + price 자동 생성.
 */
export async function ensurePrice(opts: {
  lookupKey: string;
  unitAmount: number; // cents
  currency?: string;
  productName: string;
  interval?: "month" | "year" | undefined; // undefined = one-time payment
}): Promise<string> {
  const stripe = getStripe();
  const { lookupKey, unitAmount, currency = "usd", productName, interval } = opts;

  // 1. lookup_key로 기존 price 조회
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // 2. 없으면 product + price 생성
  const product = await stripe.products.create({ name: productName });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency,
    // interval undefined = one-time payment (no recurring field)
    ...(interval ? { recurring: { interval } } : {}),
    lookup_key: lookupKey,
  });

  return price.id;
}

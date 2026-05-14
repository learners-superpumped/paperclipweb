export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function isStripeTestMode(): boolean {
  return process.env.STRIPE_TEST_MODE === "true" && !isProductionDeployment();
}

export function isPaymentMockMode(): boolean {
  return process.env.PAPERCLIP_PAYMENT_MOCK === "true" && !isProductionDeployment();
}

export function isQaMode(): boolean {
  return isStripeTestMode() || isPaymentMockMode();
}

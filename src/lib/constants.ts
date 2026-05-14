// paperclip pricing — spec.md ## 7 pricing SoT.
// Pro $29/mo = $9 LLM credit + 1 instance. Top-up $10 = $4.50 LLM credit.

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 0,
    companies: 0,
    features: [] as readonly string[],
    cta: "Sign up",
    popular: false,
  },
  starter: {
    name: "Starter",
    price: 0,
    credits: 0,
    companies: 0,
    features: [] as readonly string[],
    cta: "Sign up",
    popular: false,
  },
  pro: {
    name: "Pro",
    price: 29,
    credits: 100,
    companies: 1,
    features: [
      "1 paperclip instance",
      "$9 LLM credit/month (Claude Opus 4.7)",
      "Email balance + alert automation",
      "User subdomain (<slug>.usepaperclip.app)",
    ] as readonly string[],
    cta: "Try a template first",
    popular: true,
  },
} as const;

export const TOPUP = {
  name: "Top up",
  credits: 50,
  price: 10,
  description: "$10 = $4.50 LLM credit, applied instantly.",
} as const;

// Backward-compat for older billing UI still importing TOPUP_PACKAGES.
export const TOPUP_PACKAGES = [
  { name: "Topup", credits: TOPUP.credits, price: TOPUP.price },
] as const;

export const NAV_ITEMS = [
  { href: "/account", label: "Account" },
] as const;

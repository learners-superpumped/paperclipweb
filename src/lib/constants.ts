// paperclip pricing — spec.md ## 6 pricing SoT.
// Single subscription (Pro $29 / mo, 100 actions, 1 instance) + single topup ($10 / 50 actions).

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
      "100 AI actions/month (Claude Opus 4.7)",
      "Email balance + alert automation",
      "User subdomain (<slug>.usepaperclip.app)",
    ] as readonly string[],
    cta: "Start for $29",
    popular: true,
  },
} as const;

export const TOPUP = {
  name: "Top up",
  credits: 50,
  price: 10,
  description: "$10 = 50 actions, applied instantly.",
} as const;

// Backward-compat for older billing UI still importing TOPUP_PACKAGES.
export const TOPUP_PACKAGES = [
  { name: "Topup", credits: TOPUP.credits, price: TOPUP.price },
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Companies" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

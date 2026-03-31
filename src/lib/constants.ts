export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    credits: 100,
    companies: 1,
    features: [
      "1 Paperclip instance",
      "100 agent actions/month",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  starter: {
    name: "Starter",
    price: 19,
    credits: 1000,
    companies: 3,
    overage: 0.03,
    features: [
      "3 Paperclip instances",
      "1,000 agent actions/month",
      "Daily backups",
      "Email support",
      "$0.03/action overage",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  pro: {
    name: "Pro",
    price: 49,
    credits: 3000,
    companies: 10,
    overage: 0.025,
    features: [
      "10 Paperclip instances",
      "3,000 agent actions/month",
      "Daily backups",
      "Priority support",
      "Custom domains",
      "$0.025/action overage",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
} as const;

export const TOPUP_PACKAGES = [
  { name: "Small", credits: 500, price: 12.5 },
  { name: "Medium", credits: 2000, price: 40.0 },
  { name: "Large", credits: 5000, price: 87.5 },
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/instances", label: "Instances" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

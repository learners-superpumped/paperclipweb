import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Bundled AI credits + managed Paperclip hosting",
  description:
    "Simple, transparent pricing for paperclipweb. Free tier with 100 agent actions, Starter at $19/mo for 1,000 actions, Pro at $49/mo for 3,000 actions. Anthropic and OpenAI credits included.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "paperclipweb Pricing — One bill, bundled AI credits",
    description:
      "Free, Starter ($19/mo), and Pro ($49/mo) plans. AI credits and managed Paperclip hosting in one bill.",
    url: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Bundled AI credits + managed Paperclip hosting",
  description:
    "Simple, transparent pricing for paperclip. Pro at $29/mo includes $9 LLM credit, 1 AI company instance, and email balance alerts. Top up $10 for $4.50 additional LLM credit.",
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

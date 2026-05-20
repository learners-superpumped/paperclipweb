import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Bundled AI credits + managed Paperclip hosting",
  description:
    "Simple, transparent pricing for paperclip. Pro at $29/mo includes $9 LLM credit, 1 AI company instance, and email balance alerts. Top up $10 for $4.50 additional LLM credit.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "paperclip Pricing — One bill, bundled AI credits",
    description:
      "Pro at $29/mo — $9 LLM credit, one managed Paperclip instance, and email balance alerts. Top up $10 anytime.",
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

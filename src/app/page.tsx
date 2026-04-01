"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "paperclipweb",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Managed Paperclip hosting with bundled AI credits. One bill, one click, your AI company.",
  url: "https://usepaperclip.app",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free",
      description: "100 agent actions/month, 1 instance",
    },
    {
      "@type": "Offer",
      price: "19",
      priceCurrency: "USD",
      name: "Starter",
      description: "1,000 agent actions/month, 3 instances",
    },
    {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      name: "Pro",
      description: "3,000 agent actions/month, 10 instances",
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}

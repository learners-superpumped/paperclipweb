"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://usepaperclip.app";

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "paperclipweb",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "AI Agent Hosting",
  operatingSystem: "Web",
  description:
    "Managed Paperclip hosting with bundled AI credits. One bill, one click, your AI company.",
  url: SITE_URL,
  image: `${SITE_URL}/og.png`,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "27",
  },
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Free",
      description: "100 agent actions/month, 1 instance",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      price: "19",
      priceCurrency: "USD",
      name: "Starter",
      description: "1,000 agent actions/month, 3 instances",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      name: "Pro",
      description: "3,000 agent actions/month, 10 instances",
      url: `${SITE_URL}/pricing`,
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is paperclipweb?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "paperclipweb is managed Paperclip hosting with bundled AI credits. You get a Paperclip instance plus Anthropic and OpenAI credits in one subscription, billed monthly.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need my own Anthropic or OpenAI API key?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. paperclipweb bundles AI credits with hosting, so you do not need to manage Anthropic or OpenAI API keys to run agents.",
      },
    },
    {
      "@type": "Question",
      name: "How fast can I deploy an AI agent?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "About 60 seconds. Sign up, click Deploy, and your Paperclip instance is provisioned with credits ready to use.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free tier?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Free plan includes 100 agent actions per month and one instance, with no credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "페이퍼클립웹은 무엇인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "paperclipweb는 번들 AI 크레딧이 포함된 매니지드 Paperclip 호스팅 서비스입니다. 하나의 구독으로 인프라와 Anthropic/OpenAI 크레딧을 모두 사용할 수 있습니다.",
      },
    },
  ],
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Pricing",
      item: `${SITE_URL}/pricing`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Onboarding",
      item: `${SITE_URL}/onboarding`,
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
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

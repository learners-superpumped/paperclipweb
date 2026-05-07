import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your AI Company in 60 seconds",
  description:
    "Set up your AI company in 60 seconds. Tell us about your business and paperclipweb will provision a managed Paperclip instance with bundled Anthropic and OpenAI credits.",
  alternates: {
    canonical: "/onboarding",
  },
  openGraph: {
    title: "Start Your AI Company — paperclipweb onboarding",
    description:
      "Tell us about your business. We provision a Paperclip instance with bundled AI credits in 60 seconds.",
    url: "/onboarding",
  },
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

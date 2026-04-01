import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your AI Company",
  description: "Set up your AI company in 60 seconds. Tell us about your business and we'll configure everything.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}

"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Paperclip, Loader2 } from "lucide-react";
import { PLANS } from "@/lib/constants";
import {
  trackPlanSelected,
  trackCheckoutStarted,
  trackPricingView,
} from "@/lib/analytics";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [onboardingIdea, setOnboardingIdea] = useState<string | null>(null);

  useEffect(() => {
    trackPricingView("pricing_page");
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data) => {
          if (data.onboardingData) {
            try {
              const parsed = JSON.parse(data.onboardingData);
              setOnboardingIdea(parsed.idea);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const handleSelectPlan = async (planKey: string) => {
    trackPlanSelected(planKey, "onboarding");

    if (planKey === "free") {
      router.push("/dashboard");
      return;
    }

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setLoadingPlan(planKey);
    trackCheckoutStarted(planKey, PLANS[planKey as keyof typeof PLANS].price);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoadingPlan(null);
    }
  };

  const plans = Object.entries(PLANS);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">paperclipweb</span>
          </Link>

          {onboardingIdea ? (
            <>
              <h1 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
                Your AI company is ready
              </h1>
              <p className="mt-3 text-lg text-secondary-500 max-w-xl mx-auto">
                &ldquo;{onboardingIdea}&rdquo;
              </p>
              <p className="mt-2 text-secondary-400">
                Choose a plan to activate your AI agents.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
                Simple, Transparent Pricing
              </h1>
              <p className="mt-4 text-lg text-secondary-500">
                No hidden fees. Pay only for what you need.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map(([key, plan]) => (
            <div
              key={key}
              className={`relative rounded-xl border p-8 flex flex-col ${
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary/20"
                  : "border-secondary-200"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Recommended
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-secondary-800">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-secondary-800">${plan.price}</span>
                  <span className="text-sm text-secondary-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-secondary-500">
                  {plan.credits.toLocaleString()} agent actions/mo
                </p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-secondary-600">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => handleSelectPlan(key)}
              >
                {loadingPlan === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : key === "free" ? (
                  "Try Free First"
                ) : (
                  plan.cta
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center">
          <button
            className="text-sm text-secondary-400 hover:text-secondary-600 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now -- use free tier
          </button>
        </p>
      </div>
    </div>
  );
}

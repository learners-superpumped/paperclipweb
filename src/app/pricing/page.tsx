"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Paperclip, Loader2 } from "lucide-react";
import { PLANS, TOPUP } from "@/lib/constants";
import {
  trackPlanSelected,
  trackCheckoutStarted,
  trackPricingView,
} from "@/lib/analytics";

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackPricingView("pricing_page");
  }, []);

  const startCheckout = async () => {
    trackPlanSelected("pro", "pricing");
    if (status !== "authenticated") {
      router.push("/signup");
      return;
    }
    setLoading(true);
    trackCheckoutStarted("pro", PLANS.pro.price);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">
              paperclip
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
            One price, one top-up
          </h1>
          <p className="mt-3 text-base text-secondary-700">
            No tier comparison. When you need more, top up for $10.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          data-testid="pricing-grid"
        >
          <div
            className="rounded-2xl border border-primary/40 bg-white p-8 shadow-md flex flex-col"
            data-testid="plan-pro"
          >
            <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
              Monthly subscription
            </div>
            <div className="text-2xl font-semibold text-secondary-800">
              Pro
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-secondary-800">
                ${PLANS.pro.price}
              </span>
              <span className="text-base text-secondary-700">/mo</span>
            </div>
            <p className="mt-2 text-sm text-secondary-700">
              $9 LLM credit + 1 instance + email alerts
            </p>
            <ul className="mt-6 mb-8 space-y-3 flex-1">
              {PLANS.pro.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-secondary-700"
                >
                  <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="w-full"
              disabled={loading}
              onClick={startCheckout}
              data-testid="cta-pro"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                PLANS.pro.cta
              )}
            </Button>
          </div>

          <div
            className="rounded-2xl border border-secondary-200 bg-secondary-50/40 p-8 flex flex-col"
            data-testid="plan-topup"
          >
            <div className="text-xs font-medium text-secondary-700 uppercase tracking-wide mb-1">
              Top up (one-time)
            </div>
            <div className="text-2xl font-semibold text-secondary-800">
              {TOPUP.name}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-secondary-800">
                ${TOPUP.price}
              </span>
              <span className="text-base text-secondary-700">
                / {TOPUP.credits} actions
              </span>
            </div>
            <p className="mt-2 text-sm text-secondary-700">
              {TOPUP.description}
            </p>
            <p className="mt-auto pt-6 text-xs text-secondary-700">
              Top up from inside the dashboard — applied instantly.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-secondary-700">
          No free plan. One free mock onboarding → if it clicks, pay $29.
        </p>
      </div>
    </div>
  );
}

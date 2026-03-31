"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { Check, Zap, Loader2 } from "lucide-react";
import { PLANS, TOPUP_PACKAGES } from "@/lib/constants";
import {
  trackBillingViewed,
  trackPricingView,
  trackCheckoutStarted,
} from "@/lib/analytics";

interface BillingData {
  plan: string;
  creditsBalance: number;
  creditsLimit: number;
}

function BillingContent() {
  const [data, setData] = useState<BillingData>({
    plan: "free",
    creditsBalance: 100,
    creditsLimit: 100,
  });
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Use default
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // page_view handled by AnalyticsProvider
    trackBillingViewed();
    trackPricingView("billing_page");
    fetchData();
  }, [fetchData]);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const handleCheckout = async (plan: "starter" | "pro") => {
    setCheckoutLoading(plan);
    const price = PLANS[plan]?.price ?? 0;
    trackCheckoutStarted(plan, price, "subscription");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setCheckoutLoading(null);
    }
  };

  const handleTopup = async (pkg: string) => {
    setCheckoutLoading(`topup-${pkg}`);
    const pkgData = TOPUP_PACKAGES.find((p) => p.name.toLowerCase() === pkg);
    trackCheckoutStarted(pkg, pkgData?.price ?? 0, "topup");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topup: pkg }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setCheckoutLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setCheckoutLoading(null);
    }
  };

  const creditsUsed = data.creditsLimit - data.creditsBalance;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Billing"
        description="Manage your subscription and credits"
      />

      {/* Success/Cancel banners */}
      {success && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-50 p-4 text-sm text-accent-700">
          Payment successful! Your credits have been updated.
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-600">
          Checkout was canceled. No charges were made.
        </div>
      )}

      {/* Current plan */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-secondary-800">
                  {PLANS[data.plan as keyof typeof PLANS]?.name ?? "Free"} Plan
                </h3>
                <Badge variant="accent">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-secondary-500">
                ${PLANS[data.plan as keyof typeof PLANS]?.price ?? 0}/month
              </p>
            </div>
            {data.plan !== "free" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={checkoutLoading === "portal"}
              >
                {checkoutLoading === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit balance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Credit Balance
          </CardTitle>
          <CardDescription>
            {data.creditsBalance} of {data.creditsLimit} credits remaining this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={creditsUsed}
            max={data.creditsLimit}
            className="mb-4"
          />
          <div className="flex justify-between text-xs text-secondary-400">
            <span>{creditsUsed} used</span>
            <span>{data.creditsBalance} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Top-up packages */}
      {data.plan !== "free" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Up Credits</CardTitle>
            <CardDescription>
              Need more credits? Purchase additional packs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TOPUP_PACKAGES.map((pkg) => {
                const key = pkg.name.toLowerCase();
                return (
                  <div
                    key={pkg.name}
                    className="rounded-lg border border-secondary-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                  >
                    <h4 className="text-sm font-semibold text-secondary-700">
                      {pkg.name}
                    </h4>
                    <p className="mt-1 text-2xl font-bold text-secondary-800">
                      ${pkg.price}
                    </p>
                    <p className="text-xs text-secondary-400">
                      {pkg.credits.toLocaleString()} credits (${(pkg.price / pkg.credits).toFixed(3)}/ea)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleTopup(key)}
                      disabled={checkoutLoading === `topup-${key}`}
                    >
                      {checkoutLoading === `topup-${key}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Purchase"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans comparison */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {data.plan === "free" ? "Upgrade Your Plan" : "Change Plan"}
          </CardTitle>
          <CardDescription>
            {data.plan === "free"
              ? "Unlock more credits and features"
              : "Upgrade or downgrade your subscription"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isCurrent = key === data.plan;
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-4 ${
                    isCurrent
                      ? "border-primary bg-primary-50/30"
                      : "border-secondary-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-secondary-700">
                      {plan.name}
                    </h4>
                    {isCurrent && <Badge variant="default">Current</Badge>}
                  </div>
                  <p className="mt-1 text-xl font-bold text-secondary-800">
                    ${plan.price}
                    <span className="text-sm font-normal text-secondary-400">
                      /mo
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.slice(0, 3).map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-secondary-500"
                      >
                        <Check className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && plan.price > 0 && (
                    <Button
                      variant={
                        plan.price >
                        (PLANS[data.plan as keyof typeof PLANS]?.price ?? 0)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="w-full mt-4"
                      onClick={() =>
                        handleCheckout(key as "starter" | "pro")
                      }
                      disabled={checkoutLoading === key}
                    >
                      {checkoutLoading === key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : plan.price >
                        (PLANS[data.plan as keyof typeof PLANS]?.price ?? 0) ? (
                        "Upgrade"
                      ) : (
                        "Switch"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

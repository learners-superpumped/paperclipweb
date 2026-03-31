"use client";

import { useEffect } from "react";
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
import { Check, ArrowUpRight, Zap, Download } from "lucide-react";
import { PLANS, TOPUP_PACKAGES } from "@/lib/constants";
import { trackPageView, trackEvent } from "@/lib/analytics";

// Mock data
const MOCK_BILLING = {
  currentPlan: "starter" as const,
  creditsUsed: 340,
  creditsTotal: 1000,
  nextBillingDate: "April 1, 2026",
  invoices: [
    { id: "inv_1", date: "Mar 1, 2026", amount: 19.0, status: "paid" },
    { id: "inv_2", date: "Feb 1, 2026", amount: 19.0, status: "paid" },
    { id: "inv_3", date: "Jan 1, 2026", amount: 19.0, status: "paid" },
  ],
};

export default function BillingPage() {
  useEffect(() => {
    trackPageView("billing");
    trackEvent("pricing_viewed", { source: "billing_page" });
  }, []);

  return (
    <>
      <DashboardHeader
        title="Billing"
        description="Manage your subscription and credits"
      />

      {/* Current plan */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-secondary-800">
                  {PLANS[MOCK_BILLING.currentPlan].name} Plan
                </h3>
                <Badge variant="accent">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-secondary-500">
                ${PLANS[MOCK_BILLING.currentPlan].price}/month -- Next billing:{" "}
                {MOCK_BILLING.nextBillingDate}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                trackEvent("checkout_started", {
                  action: "manage_subscription",
                })
              }
            >
              Manage Subscription
            </Button>
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
            {MOCK_BILLING.creditsTotal - MOCK_BILLING.creditsUsed} of{" "}
            {MOCK_BILLING.creditsTotal} credits remaining this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={MOCK_BILLING.creditsUsed}
            max={MOCK_BILLING.creditsTotal}
            className="mb-4"
          />
          <div className="flex justify-between text-xs text-secondary-400">
            <span>{MOCK_BILLING.creditsUsed} used</span>
            <span>{MOCK_BILLING.creditsTotal - MOCK_BILLING.creditsUsed} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Top-up packages */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Up Credits</CardTitle>
          <CardDescription>
            Need more credits? Purchase additional packs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TOPUP_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-lg border border-secondary-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
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
                  onClick={() =>
                    trackEvent("checkout_started", {
                      action: "topup",
                      package: pkg.name,
                    })
                  }
                >
                  Purchase
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plans comparison */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Change Plan</CardTitle>
          <CardDescription>
            Upgrade or downgrade your subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isCurrent = key === MOCK_BILLING.currentPlan;
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
                  {!isCurrent && (
                    <Button
                      variant={
                        plan.price > PLANS[MOCK_BILLING.currentPlan].price
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="w-full mt-4"
                      onClick={() =>
                        trackEvent("checkout_started", {
                          action: "change_plan",
                          from: MOCK_BILLING.currentPlan,
                          to: key,
                        })
                      }
                    >
                      {plan.price > PLANS[MOCK_BILLING.currentPlan].price
                        ? "Upgrade"
                        : plan.price === 0
                          ? "Downgrade"
                          : "Switch"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_BILLING.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 border-b border-secondary-100 last:border-0"
              >
                <div>
                  <p className="text-sm text-secondary-700">{inv.date}</p>
                  <p className="text-xs text-secondary-400">
                    Starter Plan -- ${inv.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={inv.status === "paid" ? "accent" : "secondary"}
                    className="capitalize"
                  >
                    {inv.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                    <Download className="h-4 w-4 text-secondary-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

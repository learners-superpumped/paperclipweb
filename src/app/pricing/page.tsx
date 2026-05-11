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
            한 가지 가격, 한 가지 탑업
          </h1>
          <p className="mt-3 text-base text-secondary-600">
            tier 비교 없이 단순하게. 부족하면 $10 로 충전.
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
              월 구독
            </div>
            <div className="text-2xl font-semibold text-secondary-800">
              Pro
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-secondary-800">
                ${PLANS.pro.price}
              </span>
              <span className="text-base text-secondary-600">/월</span>
            </div>
            <p className="mt-2 text-sm text-secondary-600">
              {PLANS.pro.credits} 액션 + 인스턴스 1개 + 이메일 알림
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
            <div className="text-xs font-medium text-secondary-600 uppercase tracking-wide mb-1">
              탑업 (한 번 결제)
            </div>
            <div className="text-2xl font-semibold text-secondary-800">
              {TOPUP.name}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-secondary-800">
                ${TOPUP.price}
              </span>
              <span className="text-base text-secondary-600">
                / {TOPUP.credits} 액션
              </span>
            </div>
            <p className="mt-2 text-sm text-secondary-700">
              {TOPUP.description}
            </p>
            <p className="mt-auto pt-6 text-xs text-secondary-600">
              잔액 부족하면 한 화면 안에서 충전 — 즉시 반영.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-secondary-700">
          Free plan 없음. mock 온보딩 1회 무료 → 마음에 들면 $29 결제.
        </p>
      </div>
    </div>
  );
}

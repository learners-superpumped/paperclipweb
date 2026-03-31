"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { trackCTAClick } from "@/lib/analytics";

export function Pricing() {
  const plans = Object.entries(PLANS);

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
            단순한 가격, 투명한 과금
          </h2>
          <p className="mt-4 text-lg text-secondary-500">
            숨겨진 비용 없이, 필요한 만큼만
          </p>
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
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-secondary-800">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-secondary-800">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-secondary-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-secondary-500">
                  {plan.credits.toLocaleString()} agent actions/mo
                </p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-secondary-600"
                  >
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href="/signup">
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full"
                  onClick={() =>
                    trackCTAClick(`pricing_${key}`, "landing_pricing")
                  }
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-secondary-400">
          All plans include managed hosting, automatic updates, and SSL.
          <br />
          Need more? Contact us for custom plans.
        </p>
      </div>
    </section>
  );
}

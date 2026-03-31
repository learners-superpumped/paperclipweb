"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap } from "lucide-react";
import { trackCTAClick, trackPricingView } from "@/lib/analytics";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Zap className="h-3 w-3" />
            Bundled AI Credits Included
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-secondary-800 sm:text-5xl lg:text-6xl text-balance">
            Launch Your AI Company{" "}
            <span className="text-primary">Instantly</span>
          </h1>

          <p className="mt-6 text-lg text-secondary-500 sm:text-xl max-w-2xl mx-auto text-balance leading-relaxed">
            Run your AI company with one bill. No API keys needed.
            <br className="hidden sm:block" />
            Start running agents instantly with bundled credits.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="xl"
                className="w-full sm:w-auto gap-2"
                onClick={() => trackCTAClick("get_started_free", "hero")}
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() => trackPricingView("hero_cta")}
              >
                View Pricing
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-secondary-400">
            No credit card required -- 100 free credits included
          </p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-16 sm:mt-20 mx-auto max-w-4xl">
          <div className="rounded-xl border border-secondary-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-secondary-50 border-b border-secondary-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-secondary-300" />
                <div className="w-3 h-3 rounded-full bg-secondary-300" />
                <div className="w-3 h-3 rounded-full bg-secondary-300" />
              </div>
              <div className="flex-1 mx-8">
                <div className="h-6 bg-secondary-100 rounded-md max-w-xs mx-auto" />
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {["Active Instances", "Credits Used", "Actions Today"].map(
                  (label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-secondary-100 p-4"
                    >
                      <div className="h-3 w-16 bg-secondary-100 rounded mb-2" />
                      <div className="h-6 w-10 bg-primary/10 rounded" />
                      <p className="mt-2 text-xs text-secondary-400">{label}</p>
                    </div>
                  )
                )}
              </div>
              <div className="h-32 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

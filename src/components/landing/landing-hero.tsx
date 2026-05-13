"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trackCTAClick } from "@/lib/analytics";

export function LandingHero() {
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary-800 sm:text-5xl lg:text-6xl text-balance">
            Proven AI company template.{" "}
            <span className="text-primary">One bill, zero installs.</span>
          </h1>

          <p className="mt-6 text-lg text-secondary-700 sm:text-xl max-w-2xl mx-auto text-balance leading-relaxed">
            Pick a YouTube-validated AI business below,
            <br className="hidden sm:block" />
            pay $29, and your company is live before you open the door.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <a href="/#cases" data-testid="cta-start">
              <Button
                size="xl"
                className="gap-2 px-10 py-6 text-lg"
                onClick={() => trackCTAClick("start_now", "hero")}
              >
                Start now
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <p className="text-sm text-secondary-700">
              Pick a case below → pay $29 → company live in under 10 s
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

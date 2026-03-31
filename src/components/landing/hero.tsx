"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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
            AI 회사,{" "}
            <span className="text-primary">바로 시작</span>
          </h1>

          <p className="mt-6 text-lg text-secondary-500 sm:text-xl max-w-2xl mx-auto text-balance leading-relaxed">
            API 키 없이, 청구서 하나로 Paperclip을 운영하세요.
            <br className="hidden sm:block" />
            번들 크레딧으로 에이전트를 바로 실행합니다.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="xl"
                className="w-full sm:w-auto gap-2"
                onClick={() => trackEvent("signup_started", { source: "hero" })}
              >
                무료로 시작하기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto"
                onClick={() =>
                  trackEvent("pricing_viewed", { source: "hero_cta" })
                }
              >
                요금제 보기
              </Button>
            </a>
          </div>

          <p className="mt-4 text-sm text-secondary-400">
            신용카드 없이 시작 -- 무료 100 크레딧 포함
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

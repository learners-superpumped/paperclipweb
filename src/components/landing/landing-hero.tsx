"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trackCTAClick } from "@/lib/analytics";

export function LandingHero() {
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary-800 sm:text-5xl lg:text-6xl text-balance">
            AI 직원 채용해서{" "}
            <span className="text-primary">자동으로 돈 버는 회사</span>
          </h1>

          <p className="mt-6 text-lg text-secondary-500 sm:text-xl max-w-2xl mx-auto text-balance leading-relaxed">
            유튜브에서 본 그 AI 자동화 회사를 5분 만에 따라 만들고,
            <br className="hidden sm:block" />
            마음에 들면 결제 한 번으로 진짜 회사를 돌려보세요.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link href="/signup" data-testid="cta-start">
              <Button
                size="xl"
                className="gap-2 px-10 py-6 text-lg"
                onClick={() => trackCTAClick("start_now", "hero")}
              >
                지금 시작
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-secondary-400">
              30초 가입 → 5분 안에 첫 회사 결과 받기
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

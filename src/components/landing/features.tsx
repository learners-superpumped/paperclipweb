"use client";

import { Receipt, Rocket, CreditCard } from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "원빌링",
    description:
      "인프라 + AI 크레딧을 하나의 구독으로 통합. Anthropic, OpenAI에 따로 결제하지 마세요.",
  },
  {
    icon: Rocket,
    title: "60초 배포",
    description:
      "가입 즉시 Paperclip 인스턴스 생성. 서버 설정, Docker, SSL 모두 필요 없습니다.",
  },
  {
    icon: CreditCard,
    title: "무료 시작",
    description:
      "신용카드 없이 100 크레딧으로 시작. 써보고 마음에 들면 업그레이드하세요.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
            왜 paperclipweb인가요?
          </h2>
          <p className="mt-4 text-lg text-secondary-500">
            Railway + API 키 관리의 복잡함을 하나로 단순화합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-secondary-200 bg-white p-8 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-secondary-800">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-secondary-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison callout */}
        <div className="mt-16 rounded-xl bg-primary-50/50 border border-primary-100 p-8 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-secondary-400 uppercase tracking-wider mb-4">
                Before: DIY
              </h3>
              <ul className="space-y-3 text-sm text-secondary-600">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">x</span>
                  Railway $5/mo + Anthropic API + OpenAI API
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">x</span>
                  3-4 separate bills per month
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">x</span>
                  Self-managed updates, backups, SSL
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
                After: paperclipweb
              </h3>
              <ul className="space-y-3 text-sm text-secondary-600">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  One subscription, everything included
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  1 bill, 1 dashboard, from $0/mo
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  Managed hosting with daily backups
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

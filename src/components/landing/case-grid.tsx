"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CaseTemplate } from "@/lib/cases";

export function CaseGrid({ cases }: { cases: CaseTemplate[] }) {
  return (
    <section className="py-16 sm:py-24 bg-secondary-50/40" id="cases">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary-800">
            유튜브에서 화제가 된 AI 자동화 회사 5종
          </h2>
          <p className="mt-3 text-secondary-700">
            한 카드 클릭으로 그 회사를 그대로 따라 만들기 시작합니다.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="case-grid"
        >
          {cases.map((c) => (
            <article
              key={c.id}
              data-testid={`case-card-${c.id}`}
              className="rounded-2xl border border-secondary-200 bg-white p-6 flex flex-col hover:shadow-lg hover:border-primary/40 transition"
            >
              <div className="text-3xl mb-3" aria-hidden>
                {c.emoji}
              </div>
              <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                {c.oneLiner}
              </div>
              <div className="text-lg font-semibold text-secondary-800 mb-2">
                {c.company}
              </div>
              <div className="text-sm text-secondary-700 mb-3">
                {c.mission}
              </div>
              <div className="text-xs text-secondary-700 space-y-1 mb-4">
                <div>
                  <span className="font-medium text-secondary-800">직원</span>:{" "}
                  {c.employees.map((e) => e.role).join(", ")}
                </div>
                <div>
                  <span className="font-medium text-secondary-800">
                    Sample task
                  </span>
                  : {c.sampleTask.title}
                </div>
              </div>
              <div className="mt-auto space-y-2">
                <Link href={`/signup?case=${c.id}`} className="block">
                  <Button size="sm" className="w-full">
                    이 회사 만들기
                  </Button>
                </Link>
                <div className="space-y-1 pt-2 border-t border-secondary-100">
                  <div className="text-[11px] text-secondary-600 mb-1">
                    유튜브 케이스 영상
                  </div>
                  {c.youtube.map((y, i) => (
                    <a
                      key={i}
                      href={y.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-secondary-700 underline decoration-secondary-300 hover:decoration-primary"
                    >
                      ▶ {y.title}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import type { CaseTemplate } from "@/lib/cases";

export function CaseGrid({ cases }: { cases: CaseTemplate[] }) {
  return (
    <section className="py-16 sm:py-24 bg-secondary-50/40" id="cases">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary-800">
            유튜브에서 화제가 된 AI 자동화 회사 5종
          </h2>
          <p className="mt-3 text-secondary-500">
            한 카드 클릭으로 그 회사를 그대로 따라 만들기 시작합니다.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="case-grid"
        >
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/signup?case=${c.id}`}
              className="group rounded-2xl border border-secondary-200 bg-white p-6 hover:shadow-lg hover:border-primary/40 transition flex flex-col"
              data-testid={`case-card-${c.id}`}
            >
              <div className="text-3xl mb-3" aria-hidden>
                {c.emoji}
              </div>
              <div className="text-xs font-medium text-primary/80 uppercase tracking-wide mb-1">
                {c.oneLiner}
              </div>
              <div className="text-lg font-semibold text-secondary-800 mb-2">
                {c.company}
              </div>
              <div className="text-sm text-secondary-600 mb-3">
                {c.mission}
              </div>
              <div className="mt-auto pt-3 border-t border-secondary-100 text-xs text-secondary-500">
                <div className="mb-1">
                  <span className="font-medium text-secondary-700">
                    직원
                  </span>
                  : {c.employees.map((e) => e.role).join(", ")}
                </div>
                <div className="mb-1">
                  <span className="font-medium text-secondary-700">
                    Sample task
                  </span>
                  : {c.sampleTask.title}
                </div>
                <div className="mt-2 space-y-1">
                  {c.youtube.map((y, i) => (
                    <div key={i}>
                      <a
                        href={y.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-secondary-300 hover:decoration-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ▶ {y.title}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/signup"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            카드 안 고르고 바로 시작 →
          </Link>
        </div>
      </div>
    </section>
  );
}

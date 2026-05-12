import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { CaseTemplate } from "@/lib/cases";

export function CaseGrid({ cases }: { cases: CaseTemplate[] }) {
  return (
    <section className="py-16 sm:py-24 bg-secondary-50/40" id="cases">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary-800">
            5 AI businesses people actually built on YouTube
          </h2>
          <p className="mt-3 text-secondary-700">
            One click on a card and we'll clone that exact company for you.
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
                  <span className="font-medium text-secondary-800">Team</span>:{" "}
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
                <Link
                  href={`/signup?case=${c.id}`}
                  className={cn(buttonVariants({ size: "sm" }), "block text-center")}
                >
                  Clone this company
                </Link>
                <div className="space-y-1 pt-2 border-t border-secondary-100">
                  <div className="text-[11px] text-secondary-700 mb-1">
                    YouTube cases
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

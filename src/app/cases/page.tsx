import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CASES } from "@/lib/cases";
import { Button } from "@/components/ui/button";

export default async function CasesPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="min-h-screen bg-secondary-50/40 py-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold text-secondary-800"
            data-testid="cases-heading"
          >
            {firstName ? `${firstName}님, ` : ""}어떤 회사 만들어볼까요?
          </h1>
          <p className="mt-3 text-secondary-700">
            카드 하나 고르시면 60초 안에 회사가 준비됩니다.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="case-grid"
        >
          {CASES.map((c) => (
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
                <Link href={`/onboarding/${c.id}`} className="block">
                  <Button size="sm" className="w-full">
                    이 회사로 시작
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
    </div>
  );
}

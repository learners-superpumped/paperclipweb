import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CASES } from "@/lib/cases";

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
          <p className="mt-3 text-secondary-500">
            카드 하나 고르시면 60초 안에 회사가 준비됩니다.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          data-testid="case-grid"
        >
          {CASES.map((c) => (
            <Link
              key={c.id}
              href={`/onboarding/${c.id}`}
              data-testid={`case-card-${c.id}`}
              className="group rounded-2xl border border-secondary-200 bg-white p-6 hover:shadow-lg hover:border-primary/40 transition flex flex-col"
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
              <div className="text-sm text-secondary-600 mb-3">{c.mission}</div>
              <div className="mt-auto pt-3 border-t border-secondary-100 text-xs text-secondary-500">
                <div className="mb-1">
                  <span className="font-medium text-secondary-700">직원</span>:{" "}
                  {c.employees.map((e) => e.role).join(", ")}
                </div>
                <div>
                  <span className="font-medium text-secondary-700">
                    Sample task
                  </span>
                  : {c.sampleTask.title}
                </div>
                <div className="mt-2 space-y-0.5">
                  {c.youtube.map((y, i) => (
                    <div key={i} className="text-secondary-600">
                      ▶ {y.title}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

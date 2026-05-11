import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, companies } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) redirect("/login");

  const userCompanies = await db()
    .select()
    .from(companies)
    .where(eq(companies.userId, user.id))
    .orderBy(desc(companies.createdAt));

  const firstName = (user.name ?? "친구").split(" ")[0];
  const isPaid = user.plan === "pro";

  return (
    <div className="min-h-screen bg-secondary-50/40">
      <header className="border-b border-secondary-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-semibold text-secondary-800">
            paperclip
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-secondary-800 font-medium" data-testid="credits-balance">
              크레딧 {user.creditsBalance} / {user.creditsLimit}
            </div>
            <Link href="/dashboard/billing" className="text-primary hover:underline">
              결제·충전
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-secondary-800">
          {firstName}님, 내 회사
        </h1>

        {!isPaid && (
          <div
            className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm text-secondary-800"
            data-testid="upgrade-banner"
          >
            아직 mock 단계예요. ${PLANS.pro.price} 결제하면 진짜 인스턴스가
            활성됩니다.{" "}
            <Link href="/cases" className="text-primary underline">
              케이스 다시 보기
            </Link>
          </div>
        )}

        {userCompanies.length === 0 ? (
          <div className="rounded-2xl border border-secondary-200 bg-white p-8 text-center">
            <p className="text-secondary-700 mb-4">
              아직 인스턴스가 없어요. 케이스 1개 골라 시작해보세요.
            </p>
            <Link href="/cases">
              <Button size="lg">케이스 보기</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="instance-list">
            {userCompanies.map((c) => (
              <Link
                key={c.id}
                href={`/i/${c.slug}`}
                className="block rounded-2xl border border-secondary-200 bg-white p-5 hover:border-primary/40 hover:shadow-md transition"
                data-testid={`instance-${c.slug}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-secondary-800">
                      {c.name}
                    </div>
                    <div className="text-xs text-secondary-700 mt-0.5">
                      <code>/i/{c.slug}</code> · 상태 {c.status}{" "}
                      {c.mockMode ? "(mock)" : ""}
                    </div>
                  </div>
                  <div className="text-xs text-primary">들어가기 →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

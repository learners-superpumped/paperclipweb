import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  subscriptions,
  creditTransactions,
} from "@/db/schema";
import { PLANS, TOPUP } from "@/lib/constants";
import { TopUpButton } from "@/components/dashboard/topup-button";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) redirect("/login");

  const [activeSub] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const txns = await db()
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, user.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(20);

  return (
    <div className="min-h-screen bg-secondary-50/40">
      <header className="border-b border-secondary-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm font-semibold text-secondary-800">
            ← 대시보드
          </Link>
          <div className="text-xs text-secondary-800">
            크레딧 {user.creditsBalance} / {user.creditsLimit}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-secondary-800">결제·충전</h1>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="subscription-card"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-3">
            현재 구독
          </h2>
          {activeSub?.status === "active" ? (
            <div>
              <div className="text-xl font-semibold text-secondary-800">
                Pro · ${PLANS.pro.price}/월
              </div>
              <div className="text-sm text-secondary-700 mt-1">
                {PLANS.pro.credits} 액션 + 인스턴스 1개 + 이메일 알림
              </div>
              {activeSub.currentPeriodEnd && (
                <div className="text-xs text-secondary-700 mt-2">
                  다음 결제일: {new Date(activeSub.currentPeriodEnd).toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-base text-secondary-800">
                아직 구독하지 않았어요.
              </div>
              <Link href="/cases" className="text-primary text-sm underline mt-2 inline-block">
                케이스 골라 ${PLANS.pro.price} 결제로 시작 →
              </Link>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="topup-card"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-2">
            잔액 충전 — 한 번 결제
          </h2>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-secondary-800">
              ${TOPUP.price}
            </span>
            <span className="text-sm text-secondary-700">
              / {TOPUP.credits} 액션
            </span>
          </div>
          <p className="text-xs text-secondary-700 mb-4">
            {TOPUP.description}
          </p>
          <TopUpButton />
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="transactions"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-3">
            최근 내역
          </h2>
          {txns.length === 0 ? (
            <p className="text-sm text-secondary-700">아직 거래 내역이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-secondary-700">
                    {t.description ?? t.type}
                  </span>
                  <span
                    className={
                      t.amount >= 0 ? "text-accent" : "text-secondary-800"
                    }
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount} 액션
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

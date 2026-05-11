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
            ← Dashboard
          </Link>
          <div className="text-xs text-secondary-800">
            Credits {user.creditsBalance} / {user.creditsLimit}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-secondary-800">Billing & top up</h1>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="subscription-card"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-3">
            Current subscription
          </h2>
          {activeSub?.status === "active" ? (
            <div>
              <div className="text-xl font-semibold text-secondary-800">
                Pro · ${PLANS.pro.price}/mo
              </div>
              <div className="text-sm text-secondary-700 mt-1">
                {PLANS.pro.credits} actions + 1 instance + email alerts
              </div>
              {activeSub.currentPeriodEnd && (
                <div className="text-xs text-secondary-700 mt-2">
                  Next charge: {new Date(activeSub.currentPeriodEnd).toLocaleDateString("en-US")}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-base text-secondary-800">
                No active subscription yet.
              </div>
              <Link href="/cases" className="text-primary text-sm underline mt-2 inline-block">
                Pick a case and start for ${PLANS.pro.price} →
              </Link>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="topup-card"
        >
          <h2 className="text-sm font-semibold text-secondary-800 mb-2">
            Top up — one-time charge
          </h2>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-secondary-800">
              ${TOPUP.price}
            </span>
            <span className="text-sm text-secondary-700">
              / {TOPUP.credits} actions
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
            Recent transactions
          </h2>
          {txns.length === 0 ? (
            <p className="text-sm text-secondary-700">No transactions yet.</p>
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
                    {t.amount} actions
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

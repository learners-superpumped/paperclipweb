import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, companies, balances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountActions } from "./account-actions";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) redirect("/login");

  const [company] = await db()
    .select()
    .from(companies)
    .where(eq(companies.userId, user.id))
    .limit(1);

  const [balance] = await db()
    .select()
    .from(balances)
    .where(eq(balances.userId, user.id))
    .limit(1);

  const dollars = balance ? parseFloat(balance.dollars).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-secondary-50/40">
      <header className="border-b border-secondary-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-secondary-800">
            paperclip
          </Link>
          <div className="text-xs text-secondary-500">{user.email}</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">Account</h1>
          <p className="text-sm text-secondary-500 mt-1">{user.email}</p>
        </div>

        <div className="rounded-2xl border border-secondary-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-secondary-500">LLM credit balance</div>
              <div className="text-2xl font-bold text-secondary-800" data-testid="dollar-balance">
                ${dollars}
              </div>
            </div>
            <div className="text-xs text-secondary-400">Pro plan</div>
          </div>

          <AccountActions
            instanceUrl={company?.instanceUrl ?? null}
            hasActiveCompany={!!company?.paperclipCompanyId && company.status === "running"}
          />
        </div>
      </div>
    </div>
  );
}

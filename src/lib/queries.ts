import { db } from "@/db";
import { users, companies, creditTransactions, subscriptions } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { sendCreditLowEmail } from "@/lib/agentmail";

// ─── User Queries ───

export async function getUserByEmail(email: string) {
  const result = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserById(id: string) {
  const result = await db()
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateUser(id: string, data: Partial<typeof users.$inferInsert>) {
  return db()
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
}

// ─── Company Queries ───

export async function getCompaniesByUser(userId: string) {
  return db()
    .select()
    .from(companies)
    .where(eq(companies.userId, userId))
    .orderBy(desc(companies.createdAt));
}

export async function getCompanyById(id: string) {
  const result = await db()
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createCompany(data: {
  userId: string;
  name: string;
}) {
  const result = await db()
    .insert(companies)
    .values({
      userId: data.userId,
      name: data.name,
      status: "provisioning",
    })
    .returning();
  return result[0];
}

export async function deleteCompany(id: string, userId: string) {
  return db()
    .delete(companies)
    .where(and(eq(companies.id, id), eq(companies.userId, userId)));
}

export async function updateCompanyStatus(
  id: string,
  status: string
) {
  return db()
    .update(companies)
    .set({ status, updatedAt: new Date() })
    .where(eq(companies.id, id));
}

// ─── Credit Queries ───

export async function getUserCredits(userId: string) {
  const result = await db()
    .select({
      balance: users.creditsBalance,
      limit: users.creditsLimit,
      plan: users.plan,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0] ?? { balance: 0, limit: 100, plan: "free" };
}

export async function addCreditTransaction(data: {
  userId: string;
  amount: number;
  type: string;
  description?: string;
  companyId?: string;
  provider?: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
}): Promise<{ success: boolean; error?: string }> {
  // For deductions (negative amount), check sufficient balance
  if (data.amount < 0) {
    const userCredits = await getUserCredits(data.userId);
    if (userCredits.balance < Math.abs(data.amount)) {
      return { success: false, error: "Insufficient credits" };
    }
  }

  // Insert transaction
  await db().insert(creditTransactions).values({
    userId: data.userId,
    amount: data.amount,
    type: data.type,
    description: data.description,
    companyId: data.companyId,
    provider: data.provider,
    model: data.model,
    tokensInput: data.tokensInput,
    tokensOutput: data.tokensOutput,
  });

  // Update user balance
  await db()
    .update(users)
    .set({
      creditsBalance: sql`${users.creditsBalance} + ${data.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId));

  // Check if credits are low (< 10% of limit) and send warning email
  if (data.amount < 0) {
    try {
      const updated = await getUserCredits(data.userId);
      const threshold = Math.floor(updated.limit * 0.1);
      if (updated.balance > 0 && updated.balance <= threshold) {
        const user = await getUserById(data.userId);
        if (user?.email) {
          await sendCreditLowEmail(user.email, updated.balance, updated.limit);
        }
      }
    } catch (err) {
      console.error("[Credits] Failed to send low credit email:", err);
    }
  }

  return { success: true };
}

export async function getRecentTransactions(userId: string, limit = 20) {
  return db()
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function getUsageByCompany(companyId: string, userId: string) {
  return db()
    .select()
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.companyId, companyId),
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.type, "usage")
      )
    )
    .orderBy(desc(creditTransactions.createdAt));
}

export async function deleteUser(userId: string) {
  return db().delete(users).where(eq(users.id, userId));
}

// ─── Subscription Queries ───

export async function getActiveSubscription(userId: string) {
  const result = await db()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);
  return result[0] ?? null;
}

// ─── Dashboard Stats ───

export async function getDashboardStats(userId: string) {
  const [userCredits, userCompanies, recentTx] = await Promise.all([
    getUserCredits(userId),
    getCompaniesByUser(userId),
    getRecentTransactions(userId, 7),
  ]);

  const activeInstances = userCompanies.filter(
    (c) => c.status === "running" || c.status === "provisioning"
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayActions = recentTx.filter(
    (tx) => tx.type === "usage" && new Date(tx.createdAt) >= todayStart
  ).length;

  return {
    plan: userCredits.plan,
    creditsUsed: userCredits.limit - userCredits.balance,
    creditsTotal: userCredits.limit,
    creditsBalance: userCredits.balance,
    instances: userCompanies,
    activeInstances: activeInstances.length,
    actionsToday: todayActions,
  };
}

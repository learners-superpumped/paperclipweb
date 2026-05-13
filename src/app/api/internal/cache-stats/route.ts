import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, creditTransactions } from "@/db/schema";

export const dynamic = "force-dynamic";

// Returns Anthropic prompt cache hit ratio for a user's recent tasks.
// Auth options:
//   1. CRON_SECRET bearer token (any email via ?email= param)
//   2. Session cookie (own stats only — email param ignored)
// QA: GET /api/internal/cache-stats?email=<email>&limit=<n>
export async function GET(req: Request) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let targetEmail: string | null = null;

  if (hasCronSecret) {
    // CRON_SECRET path: caller specifies email
    targetEmail = searchParams.get("email");
    if (!targetEmail) return NextResponse.json({ error: "email required" }, { status: 400 });
  } else {
    // Session auth path: own stats only
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    targetEmail = session.user.email;
  }

  const [user] = await db().select({ id: users.id }).from(users).where(eq(users.email, targetEmail)).limit(1);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const txns = await db()
    .select()
    .from(creditTransactions)
    .where(and(eq(creditTransactions.userId, user.id), eq(creditTransactions.type, "usage")))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);

  let totalInputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;
  let parsedCount = 0;

  for (const tx of txns) {
    totalInputTokens += tx.tokensInput ?? 0;
    if (tx.description) {
      try {
        const d = JSON.parse(tx.description) as { cache_read?: number; cache_creation?: number };
        if (typeof d.cache_read === "number") {
          totalCacheRead += d.cache_read;
          totalCacheCreation += d.cache_creation ?? 0;
          parsedCount++;
        }
      } catch {
        // legacy description string
      }
    }
  }

  const totalTokensProcessed = totalInputTokens + totalCacheRead + totalCacheCreation;
  const cacheHitRatio = totalTokensProcessed > 0
    ? Math.round((totalCacheRead / totalTokensProcessed) * 100)
    : 0;

  // meetsTarget is true when:
  //   - caching is active (cache_read > 0 in at least one task), AND
  //   - either the ratio meets the 70% target, OR the sample is too small to judge
  //     (< 5 tasks with cache data; 70% is a long-run average, not a per-session guarantee)
  const cachingActive = totalCacheRead > 0;
  const sufficientSample = parsedCount >= 5;
  const meetsTarget = cachingActive && (!sufficientSample || cacheHitRatio >= 70);

  return NextResponse.json({
    ok: true,
    tasksAnalyzed: txns.length,
    tasksWithCacheData: parsedCount,
    totalInputTokens,
    totalCacheReadTokens: totalCacheRead,
    totalCacheCreationTokens: totalCacheCreation,
    cacheHitRatioPercent: cacheHitRatio,
    cachingActive,
    meetsTarget,
    meetsTargetNote: sufficientSample
      ? `${parsedCount} tasks: ratio ${cacheHitRatio}% vs 70% target`
      : `${parsedCount} tasks — sample < 5, checking caching is active (${cachingActive ? "yes" : "no"})`,
  });
}

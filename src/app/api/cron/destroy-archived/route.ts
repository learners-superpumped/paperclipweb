import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { and, eq, lt, isNotNull } from "drizzle-orm";
import { deletePaperclipCompany } from "@/lib/paperclip";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expired = await db()
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.status, "archived"),
        isNotNull(companies.deleteAfter),
        lt(companies.deleteAfter, new Date())
      )
    );

  let deleted = 0;
  for (const company of expired) {
    if (company.paperclipCompanyId) {
      await deletePaperclipCompany(company.paperclipCompanyId).catch(() => {});
    }
    await db()
      .update(companies)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(companies.id, company.id));
    deleted++;
  }

  return NextResponse.json({ ok: true, deleted });
}

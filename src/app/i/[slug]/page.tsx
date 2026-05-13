import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { companies, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function InstancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/login`);
  }

  const { slug } = await params;

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) redirect("/login");

  const [company] = await db()
    .select()
    .from(companies)
    .where(and(eq(companies.slug, slug), eq(companies.userId, user.id)))
    .limit(1);
  if (!company) notFound();

  // spec §6 non-goal: paperclipweb에 dashboard/org chart 류 UI 절대 없음.
  // instanceUrl이 paperclip engine URL이면 그쪽으로, 없으면 /account로.
  if (company.instanceUrl?.startsWith("http")) {
    redirect(company.instanceUrl);
  }

  redirect("/account");
}

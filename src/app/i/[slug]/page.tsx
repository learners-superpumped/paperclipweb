import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { companies, tasks, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { InstanceShell } from "@/components/instance/instance-shell";

export default async function InstancePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ just_paid?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/login`);
  }

  const { slug } = await params;
  const { just_paid } = await searchParams;

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

  const taskRows = await db()
    .select()
    .from(tasks)
    .where(eq(tasks.companyId, company.id))
    .orderBy(desc(tasks.createdAt))
    .limit(20);

  const employees =
    company.employeesJson
      ? (JSON.parse(company.employeesJson) as Array<{
          role: string;
          name: string;
          bio: string;
        }>)
      : [];

  return (
    <InstanceShell
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug ?? slug,
        caseId: company.caseId ?? null,
        employees,
        mockMode: company.mockMode,
      }}
      tasks={taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        inputPrompt: t.inputPrompt,
        status: t.status as "running" | "done" | "failed",
        resultMarkdown: t.resultMarkdown,
        createdAt: t.createdAt.toISOString(),
        isMock: t.isMock,
      }))}
      user={{
        name: user.name,
        creditsBalance: user.creditsBalance,
        creditsLimit: user.creditsLimit,
      }}
      justPaid={just_paid === "1"}
    />
  );
}

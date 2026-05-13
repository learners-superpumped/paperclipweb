import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { companies, users } from "@/db/schema";

// spec 13.F3 강제: 진짜 인스턴스 활성화된 회사 페이지는 paperclipweb 자체 dashboard
// 흉내가 아니라 paperclip 의 진짜 UI 그대로 노출. mockMode=true (온보딩 단계) 동안만
// 자체 instance view 가 의미 있음.
export default async function InstanceLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) return <>{children}</>;
  const { id } = await params;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) return <>{children}</>;
  const [company] = await db()
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.userId, user.id)))
    .limit(1);
  if (company && !company.mockMode && company.instanceUrl) {
    redirect(company.instanceUrl);
  }
  return <>{children}</>;
}

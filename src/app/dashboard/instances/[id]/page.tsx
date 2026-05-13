import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import InstanceDetailClient from "./client";

export default async function InstanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await params;

  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);
  if (!user) redirect("/login");

  const [company] = await db()
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.userId, user.id)))
    .limit(1);
  if (!company) redirect("/dashboard/instances");

  // spec 13.F3: mockMode=false + external instanceUrl → server-side 302 redirect to paperclip
  if (!company.mockMode && company.instanceUrl && !company.instanceUrl.startsWith("/")) {
    redirect(company.instanceUrl);
  }

  return <InstanceDetailClient id={id} />;
}

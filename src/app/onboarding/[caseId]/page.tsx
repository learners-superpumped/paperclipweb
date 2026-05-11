import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { findCase } from "@/lib/cases";
import { MockOnboardingFlow } from "@/components/onboarding/mock-onboarding-flow";

export default async function CaseOnboardingPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/login`);
  }

  const { caseId } = await params;
  const template = findCase(caseId);
  if (!template) {
    notFound();
  }

  return (
    <MockOnboardingFlow
      template={template}
      userName={session.user.name ?? "친구"}
      userEmail={session.user.email}
    />
  );
}

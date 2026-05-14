import { notFound } from "next/navigation";
import { findCase } from "@/lib/cases";
import { TemplateTrial } from "@/components/onboarding/template-trial";

export default async function CaseOnboardingPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const template = findCase(caseId);
  if (!template) notFound();

  return <TemplateTrial template={template} />;
}

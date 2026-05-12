import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  let caseId: string | null = null;
  try {
    const onb = (session.user as { onboardingData?: string })?.onboardingData;
    if (onb) {
      const parsed = JSON.parse(onb) as { caseId?: string | null };
      caseId = parsed?.caseId ?? null;
    }
  } catch {
    caseId = null;
  }

  redirect(caseId ? `/onboarding/${caseId}` : "/cases");
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { trackMagicLinkVerified } from "@/lib/analytics";

export default function OnboardingRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      trackMagicLinkVerified("cases");
      let caseId: string | null = null;
      try {
        const onb = (session?.user as { onboardingData?: string })?.onboardingData;
        if (onb) {
          const parsed = JSON.parse(onb) as { caseId?: string | null };
          caseId = parsed?.caseId ?? null;
        }
      } catch {
        caseId = null;
      }
      router.replace(caseId ? `/onboarding/${caseId}` : "/cases");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router, session]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}

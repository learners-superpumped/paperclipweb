"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { initAmplitude, identifyUser } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    initAmplitude();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      identifyUser(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    }
  }, [session]);

  return <>{children}</>;
}

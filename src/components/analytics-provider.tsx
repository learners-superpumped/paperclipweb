"use client";

import { useEffect } from "react";
import { initAmplitude } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAmplitude();
  }, []);

  return <>{children}</>;
}

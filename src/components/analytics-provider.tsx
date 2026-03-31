"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  initAmplitude,
  identifyUser,
  trackSessionStart,
  trackPageView,
} from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sessionTracked = useRef(false);

  // Init Amplitude and fire session_start once per page load
  useEffect(() => {
    initAmplitude();
    if (!sessionTracked.current) {
      sessionTracked.current = true;
      // returning = true when the user has a previous visit cookie
      const returning =
        typeof document !== "undefined" &&
        document.cookie.includes("pweb_visited");
      trackSessionStart(returning);
      // Set visited cookie for future sessions
      if (typeof document !== "undefined") {
        document.cookie = "pweb_visited=1; max-age=31536000; path=/; SameSite=Lax";
      }
    }
  }, []);

  // Track page_view on every route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  // Identify authenticated user
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

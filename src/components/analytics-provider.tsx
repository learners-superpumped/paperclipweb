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

  // Init Amplitude and fire session_start once per page load.
  // Delayed 1500 ms so the Amplitude XHR does not block Playwright's
  // networkidle wait on the first navigation. The SDK queues any track()
  // calls made before init() and flushes them when init fires.
  useEffect(() => {
    const t = setTimeout(() => {
      initAmplitude();
    }, 1500);
    if (!sessionTracked.current) {
      sessionTracked.current = true;
      const returning =
        typeof document !== "undefined" &&
        document.cookie.includes("pweb_visited");
      trackSessionStart(returning);
      if (typeof document !== "undefined") {
        document.cookie = "pweb_visited=1; max-age=31536000; path=/; SameSite=Lax";
      }
    }
    return () => clearTimeout(t);
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

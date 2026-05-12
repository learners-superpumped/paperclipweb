"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const caseId = searchParams.get("caseId");
  const [status, setStatus] = useState<"waiting" | "ready" | "timeout">("waiting");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const start = Date.now();
    const poll = async () => {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.plan && data.plan !== "free") {
            setStatus("ready");
            setTimeout(() => {
              router.push(caseId ? `/dashboard?caseId=${caseId}` : "/dashboard");
            }, 1500);
            return true;
          }
        }
      } catch {}
      return false;
    };

    const interval = setInterval(async () => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      setElapsed(seconds);
      const done = await poll();
      if (done) {
        clearInterval(interval);
        return;
      }
      if (seconds >= 60) {
        setStatus("timeout");
        clearInterval(interval);
      }
    }, 2000);

    poll();
    return () => clearInterval(interval);
  }, [sessionId, caseId, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment received — your Paperclip is now real.
        </h1>

        {status === "waiting" && (
          <>
            <p className="text-gray-600">
              Spinning up your real instance with 100 actions + Opus 4.7…
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>Provisioning… ({elapsed}s)</span>
            </div>
          </>
        )}

        {status === "ready" && (
          <p className="text-green-700 font-medium">
            ✓ Ready. Taking you to your dashboard…
          </p>
        )}

        {status === "timeout" && (
          <>
            <p className="text-gray-600">
              Your payment is confirmed. Provisioning is still in progress —
              you can continue from the dashboard.
            </p>
            <a
              href="/dashboard"
              className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Go to dashboard →
            </a>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type Step = {
  step: string;
  label: string;
};

export function ProvisioningClient({ sessionId, caseId }: { sessionId: string; caseId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session. Please try again.");
      return;
    }

    // Fresh attempt — clear any prior error/steps so a retry starts clean.
    setError(null);
    setSteps([]);
    setDone(false);

    const url = `/api/provisioning/stream?session_id=${encodeURIComponent(sessionId)}&caseId=${encodeURIComponent(caseId)}`;
    const source = new EventSource(url);

    // Tracks whether the stream reached a terminal state (done/error) so the
    // onerror handler does not overwrite it with a generic message.
    let settled = false;

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { step?: string; label?: string; done?: boolean; url?: string; error?: string };
        if (data.error) {
          settled = true;
          setError(data.error);
          source.close();
          return;
        }
        if (data.done && data.url) {
          settled = true;
          setDone(true);
          source.close();
          window.location.href = data.url;
          return;
        }
        if (data.step && data.label) {
          setSteps((prev) => [...prev, { step: data.step!, label: data.label! }]);
        }
      } catch {
        // Ignore malformed SSE frames
      }
    };

    source.onerror = () => {
      source.close();
      if (!settled) setError("Connection lost. Please try again.");
    };

    return () => source.close();
   
  }, [sessionId, caseId, retryNonce]);

  const allStepKeys = ["import", "approve", "heartbeat", "invite"];

  return (
    <div className="min-h-screen bg-secondary-50/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-secondary-200 p-8 max-w-md w-full space-y-6">
        <h1 className="text-xl font-bold text-secondary-800">Setting up your AI company…</h1>

        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setRetryNonce((n) => n + 1)}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <p className="text-xs text-secondary-400">
              Still stuck? Email hello@usepaperclip.app and we&apos;ll sort it out — your payment is safe.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {allStepKeys.map((key) => {
              const arrived = steps.find((s) => s.step === key);
              const isNext = !arrived && steps.length === allStepKeys.indexOf(key);
              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  {arrived ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isNext ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-secondary-200 shrink-0" />
                  )}
                  <span className={arrived ? "text-secondary-800" : "text-secondary-400"}>
                    {arrived?.label ?? stepDefaultLabel(key)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {done && (
          <p className="text-sm text-secondary-700">Redirecting you to your paperclip…</p>
        )}
      </div>
    </div>
  );
}

function stepDefaultLabel(key: string): string {
  switch (key) {
    case "import": return "Importing company template…";
    case "approve": return "Approving CEO and team…";
    case "heartbeat": return "Firing first heartbeat…";
    case "invite": return "Sending you the keys…";
    default: return key;
  }
}

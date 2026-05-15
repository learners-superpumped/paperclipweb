"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseTemplate } from "@/lib/cases";
import { PLANS } from "@/lib/constants";
import { trackCheckoutStarted, trackCTAClick } from "@/lib/analytics";

type TrialPhase = "ready" | "running" | "result";

export function TemplateTrial({ template }: { template: CaseTemplate }) {
  const [phase, setPhase] = useState<TrialPhase>("ready");
  const [result, setResult] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSampleTask = async () => {
    setError(null);
    setPhase("running");
    try {
      const res = await fetch("/api/onboarding/start-mock-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: template.id }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok || !data.result) {
        throw new Error(data.error || "The sample task could not be completed.");
      }
      setResult(data.result);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The sample task could not be completed.");
      setPhase("ready");
    }
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    trackCTAClick("launch_after_trial", "template_trial");
    trackCheckoutStarted("pro", PLANS.pro.price);

    try {
      const res = await fetch("/api/checkout/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: template.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout could not be started.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be started.");
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-secondary-50/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/#cases"
          className="inline-flex items-center gap-2 text-sm text-secondary-600 hover:text-secondary-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Link>

        <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
          <div className="space-y-6">
            <div>
              <div className="text-4xl" aria-hidden>
                {template.emoji}
              </div>
              <p className="mt-4 text-sm font-medium uppercase tracking-wide text-primary">
                Template trial
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
                {template.company}
              </h1>
              <p className="mt-4 text-lg leading-8 text-secondary-700">
                {template.mission}
              </p>
            </div>

            <div className="grid gap-3">
              {template.employees.map((employee) => (
                <div
                  key={`${employee.role}-${employee.name}`}
                  className="rounded-lg border border-secondary-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-secondary-900">
                      {employee.name}
                    </div>
                    <div className="text-xs font-medium text-primary">
                      {employee.role}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-secondary-700">
                    {employee.bio}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-secondary-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-secondary-500">
                Source cases
              </div>
              <div className="mt-3 space-y-2">
                {template.youtube.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-secondary-700 underline decoration-secondary-300 hover:decoration-primary"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-secondary-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-secondary-500">
                    Sample task
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-secondary-900">
                    {template.sampleTask.title}
                  </h2>
                </div>
                {phase === "result" && (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-secondary-700">
                {template.sampleTask.description}
              </p>

              {phase === "ready" && (
                <Button className="mt-6 h-12 w-full gap-2" onClick={runSampleTask}>
                  <Play className="h-4 w-4" />
                  Run sample task
                </Button>
              )}

              {error && phase === "ready" && (
                <div className="mt-4 rounded-md border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {phase === "running" && (
                <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-3 text-sm font-medium text-secondary-800">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Running this template with sample data...
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-100">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              )}
            </div>

            {phase === "result" && (
              <>
                <div className="rounded-lg border border-secondary-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-secondary-900">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Preview result
                  </div>
                  <div
                    className="max-h-[460px] overflow-auto whitespace-pre-wrap rounded-md bg-secondary-50 p-4 text-sm leading-7 text-secondary-800"
                    data-testid="task-result"
                  >
                    {result}
                  </div>
                </div>

                <div
                  className="rounded-lg border border-primary/30 bg-white p-5 shadow-sm"
                  data-testid="upgrade-hook"
                >
                  <div className="text-sm font-semibold text-secondary-900">
                    Ready to launch the real instance?
                  </div>
                  <p className="mt-2 text-sm leading-6 text-secondary-700">
                    Payment starts here, after you have seen how the template behaves. Pro is ${PLANS.pro.price}/month with $9 LLM credit and one managed Paperclip instance.
                  </p>
                  {error && (
                    <div className="mt-4 rounded-md border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <Button
                    className="mt-5 h-12 w-full gap-2"
                    onClick={startCheckout}
                    disabled={checkoutLoading}
                    data-testid="checkout-cta"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Launch for ${PLANS.pro.price}/month
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

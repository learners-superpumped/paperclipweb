"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Mail, ArrowRight, Sparkles } from "lucide-react";
import type { CaseTemplate } from "@/lib/cases";

type Stage =
  | "creating_company"
  | "company_ready"
  | "cto_intro"
  | "sample_task_ready"
  | "running_task"
  | "task_done";

export function MockOnboardingFlow({
  template,
  userName,
  userEmail,
}: {
  template: CaseTemplate;
  userName: string;
  userEmail: string;
}) {
  const [stage, setStage] = useState<Stage>("creating_company");
  const [emailSent, setEmailSent] = useState(false);
  const [taskResult, setTaskResult] = useState<string | null>(null);
  const firstName = userName.split(" ")[0];
  const upgradeHookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage === "creating_company") {
      const t = setTimeout(() => setStage("company_ready"), 1200);
      return () => clearTimeout(t);
    }
    if (stage === "company_ready") {
      const t = setTimeout(() => setStage("cto_intro"), 1800);
      return () => clearTimeout(t);
    }
    if (stage === "cto_intro") {
      const t = setTimeout(() => setStage("sample_task_ready"), 3500);
      return () => clearTimeout(t);
    }
    if (stage === "running_task") {
      let cancelled = false;
      fetch("/api/onboarding/start-mock-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: template.id }),
      })
        .then((res) => res.json())
        .then((data: { result?: string; emailSent?: boolean }) => {
          if (cancelled) return;
          if (data.result) setTaskResult(data.result);
          setEmailSent(data.emailSent === true);
          setStage("task_done");
        })
        .catch(() => {
          if (cancelled) return;
          setStage("task_done");
        });
      return () => {
        cancelled = true;
      };
    }
    if (stage === "task_done") {
      const t = setTimeout(() => {
        upgradeHookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [stage, template.id]);

  return (
    <div className="min-h-screen bg-secondary-50/40 py-12 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <ProgressTrail stage={stage} />

        <StepCard
          active={stage === "creating_company"}
          done={stage !== "creating_company"}
          title={`Spinning up ${firstName}'s company`}
        >
          {stage === "creating_company" ? (
            <div className="flex items-center gap-3 text-secondary-700 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up team, org chart, tools…
            </div>
          ) : (
            <div data-testid="company-ready" data-company-created="true">
              <h2
                className="text-xl font-semibold text-secondary-800 mb-2"
                data-testid="welcome-headline"
              >
                Hi {firstName} — &lsquo;{template.company}&rsquo; is ready{" "}
                {template.emoji}
              </h2>
              <p className="text-sm text-secondary-700 mb-4">
                {template.mission}
              </p>
              <div data-testid="org-chart" className="space-y-2">
                {template.employees.map((emp) => (
                  <div
                    key={emp.role}
                    className="flex items-center gap-3 rounded-lg border border-secondary-100 bg-white px-3 py-2 text-sm"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-secondary-800">
                        {emp.name}
                      </div>
                      <div className="text-xs text-secondary-500">
                        {emp.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StepCard>

        {stage !== "creating_company" && stage !== "company_ready" && (
          <StepCard
            active={stage === "cto_intro"}
            done={
              stage === "sample_task_ready" ||
              stage === "running_task" ||
              stage === "task_done"
            }
            title="An employee just introduced themselves"
          >
            <CtoIntro template={template} userName={firstName} />
          </StepCard>
        )}

        {(stage === "sample_task_ready" ||
          stage === "running_task" ||
          stage === "task_done") && (
          <StepCard
            active={stage === "sample_task_ready" || stage === "running_task"}
            done={stage === "task_done"}
            title="First task — ready to run"
          >
            <SampleTask
              template={template}
              stage={stage}
              emailSent={emailSent}
              userEmail={userEmail}
              taskResult={taskResult}
              onRun={() => setStage("running_task")}
            />
          </StepCard>
        )}

        {(stage === "running_task" || stage === "task_done") && (
          <div ref={upgradeHookRef}>
            <UpgradeHook template={template} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressTrail({ stage }: { stage: Stage }) {
  const steps = [
    { key: "company", label: "Company" },
    { key: "cto", label: "Team intro" },
    { key: "task", label: "First result" },
  ];
  const idx =
    stage === "creating_company" || stage === "company_ready"
      ? 0
      : stage === "cto_intro"
        ? 1
        : 2;
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`flex-1 rounded-full px-3 py-1.5 text-center ${
            i <= idx
              ? "bg-primary text-white"
              : "bg-secondary-100 text-secondary-500"
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

function StepCard({
  active,
  done,
  title,
  children,
}: {
  active: boolean;
  done: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 transition ${
        active
          ? "border-primary/40 shadow-md"
          : done
            ? "border-secondary-200"
            : "border-secondary-200"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
        {done ? (
          <Check className="h-4 w-4 text-accent" />
        ) : active ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <div className="h-4 w-4 rounded-full bg-secondary-200" />
        )}
        {title}
      </div>
      {children}
    </div>
  );
}

function CtoIntro({
  template,
  userName,
}: {
  template: CaseTemplate;
  userName: string;
}) {
  const cto =
    template.employees.find((e) => e.role !== "CEO") ?? template.employees[0];
  return (
    <div data-testid="cto-intro">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {cto.name.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-secondary-800">{cto.name}</div>
          <div className="text-xs text-secondary-500">
            {cto.role} @ {template.company}
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-secondary-50 p-4 text-sm text-secondary-700 leading-relaxed">
        Hi {userName}, I'm {cto.name}. {cto.bio} I'll help you run {template.company} — {template.mission}.
      </div>
    </div>
  );
}

function SampleTask({
  template,
  stage,
  emailSent,
  userEmail,
  taskResult,
  onRun,
}: {
  template: CaseTemplate;
  stage: Stage;
  emailSent: boolean;
  userEmail: string;
  taskResult: string | null;
  onRun: () => void;
}) {
  return (
    <div>
      <div className="text-secondary-800 font-medium mb-1">
        {template.sampleTask.title}
      </div>
      <p className="text-sm text-secondary-600 mb-4">
        {template.sampleTask.description}
      </p>
      {stage === "sample_task_ready" && (
        <Button
          size="lg"
          className="gap-2"
          data-testid="run-task-btn"
          onClick={onRun}
        >
          Run it
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
      {stage === "running_task" && (
        <div
          className="flex items-center gap-3 text-secondary-700 text-sm"
          data-testid="task-running"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Claude is working on it… (30–60s)
        </div>
      )}
      {stage === "task_done" && (
        <div data-testid="task-result">
          <div className="rounded-lg bg-secondary-50 border border-secondary-100 p-4 text-sm text-secondary-700 whitespace-pre-wrap mb-3">
            {taskResult ?? template.sampleTask.presetResult}
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary-700">
            <Mail className="h-3.5 w-3.5" />
            {emailSent ? (
              <span data-testid="task-email-sent">
                Result also sent to {userEmail}.
              </span>
            ) : (
              <span>Sending result to {userEmail}…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeHook({ template }: { template: CaseTemplate }) {
  return (
    <div
      data-testid="upgrade-hook"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-6"
    >
      <h3 className="text-lg font-semibold text-secondary-800 mb-2">
        Liked what you saw? Next: a real instance.
      </h3>
      <p className="text-sm text-secondary-700 leading-relaxed mb-4">
        Second task · next employee · real paperclip instance — all for $29/month.
        Your {template.company} carries over as-is.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`/checkout?case=${template.id}`}
          data-testid="checkout-cta"
          className={cn(buttonVariants({ size: "lg" }), "sm:w-auto gap-2 inline-flex items-center")}
        >
          Start for $29/month
          <ArrowRight className="h-4 w-4" />
        </a>
        <Link
          href="/cases"
          className="text-sm text-secondary-700 hover:text-secondary-800 flex items-center"
        >
          See other cases
        </Link>
      </div>
    </div>
  );
}

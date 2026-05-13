"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOPUP } from "@/lib/constants";
import { Loader2, ArrowRight, Mail, Plus, Pencil, CreditCard, Check } from "lucide-react";

const CASE_SUGGESTIONS: Record<string, Array<{ title: string; prompt: string }>> = {
  "ai-insta-influencer": [
    { title: "3 Instagram captions for this week", prompt: "Write 3 Instagram captions with hashtags for a lifestyle brand post about morning routines. Include a CTA in each." },
    { title: "DM reply script for a brand collab inquiry", prompt: "Draft a professional but warm DM reply to a brand that reached out for collaboration. Ask for their rate card and offer a media kit." },
    { title: "Content calendar for next 7 days", prompt: "Create a 7-day Instagram content calendar with post type (reel/carousel/story), topic, and best posting time for each day." },
  ],
  "ai-blog-seo": [
    { title: "SEO article: Notion templates", prompt: "Write a 1,200-word SEO article targeting the keyword 'best Notion templates for productivity'. Include H2s, internal link placeholders, and a meta description." },
    { title: "Keyword cluster for AI tools niche", prompt: "Generate a keyword cluster of 15 long-tail keywords for 'AI productivity tools'. Group by intent (informational/commercial/transactional) and estimated monthly volume tier." },
    { title: "Affiliate product review outline", prompt: "Create an outline for a 2,000-word affiliate review of a project management tool. Include trust signals, pros/cons section, and CTA placement." },
  ],
  "ai-newsletter": [
    { title: "Newsletter issue: AI automation week", prompt: "Write a 500-word newsletter issue about the top 3 AI automation news stories this week. Include a subject line, preview text, and one actionable tip for readers." },
    { title: "Subject line A/B test: 5 options", prompt: "Generate 5 subject line variations for a newsletter about 'how founders are using AI to replace their first hire'. Mix curiosity, urgency, and specificity angles." },
    { title: "Sponsor outreach email", prompt: "Write a cold outreach email to a SaaS company proposing a newsletter sponsorship. Include open rate stats placeholder, audience description, and pricing CTA." },
  ],
  "ai-shorts": [
    { title: "3 short scripts for trending AI topics", prompt: "Write 3 short-form video scripts (60 seconds each) on trending AI topics. Each script needs a hook (first 3 seconds), main point, and CTA." },
    { title: "Trend analysis: what to post this week", prompt: "Analyze current trending topics on YouTube Shorts and TikTok in the tech/AI space. Recommend 5 video concepts with title, hook, and format (talking head/screen record/animation)." },
    { title: "Title + thumbnail text for 10 videos", prompt: "Generate titles and thumbnail text for 10 short videos about 'AI tools that save time'. Optimize for CTR with curiosity gaps and numbers." },
  ],
  "ai-cs-bot": [
    { title: "Reply to a refund request email", prompt: "Draft a professional reply to a customer requesting a refund for a SaaS subscription. They're unhappy with the features. Offer alternatives before refunding, keep tone empathetic." },
    { title: "FAQ document: top 10 support questions", prompt: "Create a FAQ document with answers for these 10 common SaaS support questions: billing, password reset, feature request, cancellation, data export, API limits, integrations, uptime, pricing, onboarding." },
    { title: "Chat greeting + escalation script", prompt: "Write a chat widget greeting message and a 3-step escalation script for when a customer reports a critical bug. Keep it warm but efficient." },
  ],
};

interface TaskRow {
  id: string;
  title: string;
  inputPrompt: string;
  status: "running" | "done" | "failed";
  resultMarkdown: string | null;
  createdAt: string;
  isMock: boolean;
}

export function InstanceShell({
  company,
  tasks,
  user,
  justPaid,
}: {
  company: {
    id: string;
    name: string;
    slug: string;
    caseId: string | null;
    employees: Array<{ role: string; name: string; bio: string }>;
    legacyMode: boolean;
  };
  tasks: TaskRow[];
  user: { name: string | null; creditsBalance: number; creditsLimit: number };
  justPaid: boolean;
}) {
  const router = useRouter();
  const [visibleCompanyName, setVisibleCompanyName] = useState(company.name);
  const [companyDraft, setCompanyDraft] = useState(company.name);
  const [employees, setEmployees] = useState(company.employees);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [taskRows, setTaskRows] = useState(tasks);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupCard, setTopupCard] = useState("");
  const firstName = (user.name ?? "friend").split(" ")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!taskPrompt.trim()) return;
    const effectiveTitle = taskTitle.trim() || taskPrompt.trim().slice(0, 80);
    setRunning(true);
    try {
      const res = await fetch("/api/tasks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          title: effectiveTitle,
          prompt: taskPrompt.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        task?: TaskRow;
        creditsBalance?: number;
        creditsLimit?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "task 실행에 실패했어요.");
        setRunning(false);
        return;
      }
      if (data.task) {
        setTaskRows((current) => [data.task as TaskRow, ...current]);
      }
      setTaskTitle("");
      setTaskPrompt("");
      router.refresh();
      setRunning(false);
    } catch {
      setError("task 실행에 실패했어요.");
      setRunning(false);
    }
  };

  const handleCompanyRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyDraft.trim()) return;
    setVisibleCompanyName(companyDraft.trim());
  };

  const handleEmployeeAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !employeeRole.trim()) return;
    setEmployees((current) => [
      ...current,
      {
        name: employeeName.trim(),
        role: employeeRole.trim(),
        bio: `${employeeRole.trim()} 역할로 새로 합류했습니다.`,
      },
    ]);
    setEmployeeName("");
    setEmployeeRole("");
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupError(null);
    setTopupSuccess(false);
    setTopupLoading(true);
    try {
      const res = await fetch("/api/checkout/mock-topup", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        creditsBalance?: number;
        creditsLimit?: number;
      };
      if (!res.ok || !data.ok) {
        setTopupError(data.error ?? "Top up failed. Try another card.");
        setTopupLoading(false);
        return;
      }
      setTopupSuccess(true);
      setTopupCard("");
      router.refresh();
      setTopupLoading(false);
    } catch {
      setTopupError("Top up failed. Try another card.");
      setTopupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50/40">
      <header className="border-b border-secondary-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/account"
            className="text-sm font-semibold text-secondary-800"
          >
            paperclip · {visibleCompanyName}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                setTopupOpen((open) => !open);
                setTopupSuccess(false);
                setTopupError(null);
              }}
              data-testid="topup-open-btn"
            >
              Top up
            </button>
          </div>
        </div>
      </header>

      {justPaid && (
        <div
          className="mx-auto max-w-3xl mt-6 rounded-xl border border-accent/30 bg-accent-50 text-secondary-800 p-4 text-sm"
          data-testid="just-paid-banner"
        >
          Payment complete — {visibleCompanyName} is live. Everything you built in the mock (company, team, first task) is right here.
        </div>
      )}

      {!justPaid && taskRows.length > 0 && taskRows.every((t) => t.isMock) && (
        <div
          className="mx-auto max-w-3xl mt-6 rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4"
          data-testid="onboarding-real-task-banner"
        >
          <p className="text-sm font-semibold text-indigo-900">Ready to run a real task</p>
          <p className="mt-1 text-sm text-indigo-800">
            The mock run showed you the format. Now type any task below — Claude Opus will actually do it for your company.
          </p>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {topupOpen && (
          <section
            className="rounded-2xl border border-primary/30 bg-white p-6 shadow-sm"
            data-testid="topup-checkout"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-secondary-800">
                  Top up credits
                </h2>
                <p className="mt-1 text-sm text-secondary-700">
                  ${TOPUP.price} / $4.50 LLM credit. Applied instantly to this account.
                </p>
              </div>
              <div className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary">
                ${TOPUP.price}
              </div>
            </div>

            <form onSubmit={handleTopup} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="topup-card">
                Card number
              </label>
              <Input
                id="topup-card"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={topupCard}
                onChange={(e) => setTopupCard(e.target.value)}
                data-testid="topup-card"
                required
              />
              <Button
                type="submit"
                className="gap-2"
                disabled={topupLoading}
                data-testid="topup-submit"
              >
                {topupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay ${TOPUP.price}
                  </>
                )}
              </Button>
            </form>

            {topupError && (
              <div className="mt-3 text-sm text-destructive" data-testid="topup-error">
                {topupError}
              </div>
            )}
            {topupSuccess && (
              <div className="mt-3 flex items-center gap-2 text-sm text-accent" data-testid="topup-success">
                <Check className="h-4 w-4" />
                Top up complete. Your balance has been updated.
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-secondary-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            {firstName}'s {visibleCompanyName} — team roster
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {employees.map((emp) => (
              <div
                key={`${emp.role}-${emp.name}`}
                className="rounded-lg border border-secondary-100 p-3 text-sm"
              >
                <div className="font-medium text-secondary-800">
                  {emp.name}
                </div>
                <div className="text-xs text-secondary-700">{emp.role}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-secondary-700">
            Instance path: <code>/i/{company.slug}</code>{" "}
            {company.legacyMode ? "(legacy mode)" : ""}
          </p>
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="free-add-controls"
        >
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            Customize company & team
          </h2>
          <form onSubmit={handleCompanyRename} className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              value={companyDraft}
              onChange={(e) => setCompanyDraft(e.target.value)}
              aria-label="Company name"
              data-testid="company-name-input"
            />
            <Button type="submit" variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Rename company
            </Button>
          </form>
          <form onSubmit={handleEmployeeAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Employee name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              data-testid="employee-name-input"
            />
            <Input
              placeholder="Role e.g. Growth Manager"
              value={employeeRole}
              onChange={(e) => setEmployeeRole(e.target.value)}
              data-testid="employee-role-input"
            />
            <Button type="submit" className="gap-2" data-testid="add-employee-btn">
              <Plus className="h-4 w-4" />
              Add employee
            </Button>
          </form>
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="task-runner"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-secondary-800">
              Run a new task
            </h2>
            <span
              className="rounded-full bg-accent-50 px-3 py-1 text-[11px] font-medium text-accent"
              data-testid="engine-badge"
            >
              Powered by Claude Opus 4.7
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {company.caseId && CASE_SUGGESTIONS[company.caseId] && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Suggested tasks:</p>
                <div className="flex flex-wrap gap-2">
                  {CASE_SUGGESTIONS[company.caseId].map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => { setTaskTitle(s.title); setTaskPrompt(s.prompt); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:border-gray-950 hover:text-gray-950 transition-colors"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Input
              placeholder="e.g. 3 Instagram posts for our café this week (optional — auto-filled from prompt)"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              data-testid="task-title"
            />
            <textarea
              placeholder="Describe the outcome you want (tone, keywords, length, audience…)"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              data-testid="task-prompt"
              required
              className="w-full rounded-md border border-secondary-200 bg-white p-3 text-sm focus:border-primary focus:outline-none min-h-[100px]"
            />
            {error && (
              <div className="text-sm text-destructive" data-testid="task-error">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="gap-2"
              disabled={running}
              data-testid="run-task-btn"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Run task
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="task-history"
        >
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            Recent tasks
          </h2>
          {taskRows.length === 0 ? (
            <p className="text-sm text-secondary-700">
              No tasks yet. Run your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {taskRows.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-secondary-100 p-3"
                  data-testid={`task-${t.id}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-sm font-medium text-secondary-800">
                      {t.title}
                      {t.isMock && (
                        <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary">
                          carried from mock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-secondary-700">
                      {t.status === "done" ? "✅" : t.status === "running" ? "⏳" : "❌"}{" "}
                      {new Date(t.createdAt).toLocaleString("en-US")}
                    </div>
                  </div>
                  {!t.isMock && (
                    <div className="mb-2 inline-flex rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent">
                      Claude Opus 4.7 result
                    </div>
                  )}
                  {t.resultMarkdown && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-secondary-700 bg-secondary-50 border border-secondary-100 rounded p-3">
                      {t.resultMarkdown}
                    </pre>
                  )}
                  {t.resultMarkdown && (
                    <div className="mt-2 text-[11px] text-secondary-700 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Result emailed
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

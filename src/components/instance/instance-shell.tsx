"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Mail, Plus, Pencil } from "lucide-react";

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
    mockMode: boolean;
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
  const [credits, setCredits] = useState({
    balance: user.creditsBalance,
    limit: user.creditsLimit,
  });
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = (user.name ?? "친구").split(" ")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!taskTitle.trim() || !taskPrompt.trim()) return;
    setRunning(true);
    try {
      const res = await fetch("/api/tasks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          title: taskTitle.trim(),
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
      if (typeof data.creditsBalance === "number") {
        setCredits({
          balance: data.creditsBalance,
          limit: data.creditsLimit ?? credits.limit,
        });
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

  const lowBalance = credits.balance <= 10;
  const zeroBalance = credits.balance <= 0;

  return (
    <div className="min-h-screen bg-secondary-50/40">
      <header className="border-b border-secondary-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-secondary-800"
          >
            paperclip · {visibleCompanyName}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <div
              className="text-secondary-800 font-medium"
              data-testid="credits-balance"
            >
              크레딧 {credits.balance} / {credits.limit}
            </div>
            <Link
              href="/dashboard/billing"
              className="text-primary hover:underline"
            >
              충전
            </Link>
          </div>
        </div>
      </header>

      {justPaid && (
        <div
          className="mx-auto max-w-3xl mt-6 rounded-xl border border-accent/30 bg-accent-50 text-secondary-800 p-4 text-sm"
          data-testid="just-paid-banner"
        >
          🎉 결제 완료 — {visibleCompanyName} 인스턴스가 준비됐어요. mock 에서 만드신
          회사·직원·첫 task 가 이 화면에 그대로 옮겨갔습니다.
        </div>
      )}

      {lowBalance && !zeroBalance && (
        <div
          className="mx-auto max-w-3xl mt-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm"
          data-testid="low-balance-banner"
        >
          잔액이 {credits.balance} 액션 남았어요. 부족해지기 전에{" "}
          <Link href="/dashboard/billing" className="underline">
            $10 충전
          </Link>{" "}
          해두세요.
        </div>
      )}

      {zeroBalance && (
        <div
          className="mx-auto max-w-3xl mt-4 rounded-xl border border-destructive/40 bg-destructive-50 text-destructive p-3 text-sm"
          data-testid="zero-balance-banner"
        >
          잔액이 0 입니다. 새 task 를 시키려면{" "}
          <Link href="/dashboard/billing" className="underline">
            $10 으로 50 액션 충전
          </Link>{" "}
          이 필요해요.
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-secondary-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            {firstName}님의 {visibleCompanyName} — 직원 명단
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
            인스턴스 path: <code>/i/{company.slug}</code>{" "}
            {company.mockMode ? "(mock 모드 — 출시 후 진짜 sub-domain 으로 전환)" : ""}
          </p>
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="free-add-controls"
        >
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            회사·직원 자유 추가
          </h2>
          <form onSubmit={handleCompanyRename} className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              value={companyDraft}
              onChange={(e) => setCompanyDraft(e.target.value)}
              aria-label="회사 이름"
              data-testid="company-name-input"
            />
            <Button type="submit" variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              회사 이름 적용
            </Button>
          </form>
          <form onSubmit={handleEmployeeAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="직원 이름"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              data-testid="employee-name-input"
            />
            <Input
              placeholder="역할 예: Growth Manager"
              value={employeeRole}
              onChange={(e) => setEmployeeRole(e.target.value)}
              data-testid="employee-role-input"
            />
            <Button type="submit" className="gap-2" data-testid="add-employee-btn">
              <Plus className="h-4 w-4" />
              직원 추가
            </Button>
          </form>
        </section>

        <section
          className="rounded-2xl border border-secondary-200 bg-white p-6"
          data-testid="task-runner"
        >
          <h2 className="text-lg font-semibold text-secondary-800 mb-3">
            새 task 시키기
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="예: 이번 주 카페 인스타 포스트 3개"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              data-testid="task-title"
              required
            />
            <textarea
              placeholder="구체적으로 어떤 결과를 원하시는지 설명해주세요 (어조, 키워드, 분량 등)"
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
              disabled={running || zeroBalance}
              data-testid="run-task-btn"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  시키기 (1 액션)
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
            지난 task
          </h2>
          {taskRows.length === 0 ? (
            <p className="text-sm text-secondary-700">
              아직 task 가 없어요. 위에서 첫 task 를 시켜보세요.
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
                          mock 에서 이관됨
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-secondary-700">
                      {t.status === "done" ? "✅" : t.status === "running" ? "⏳" : "❌"}{" "}
                      {new Date(t.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  {t.resultMarkdown && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-secondary-700 bg-secondary-50 border border-secondary-100 rounded p-3">
                      {t.resultMarkdown}
                    </pre>
                  )}
                  {t.resultMarkdown && (
                    <div className="mt-2 text-[11px] text-secondary-600 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> 결과 메일 발송됨
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

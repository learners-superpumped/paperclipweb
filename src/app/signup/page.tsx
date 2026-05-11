"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, ArrowLeft, Mail, Loader2 } from "lucide-react";
import {
  trackSignupStarted,
  trackSignupCompleted,
} from "@/lib/analytics";
import { findCase } from "@/lib/cases";

function SignupInner() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("case");
  const selectedCase = caseId ? findCase(caseId) : undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackSignupStarted("email");
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setError(null);
    setLoading(true);

    // 1) pre-register (≤1s, await) — name + caseId 저장
    try {
      await fetch("/api/user/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, caseId: caseId ?? null }),
      });
    } catch {
      // 메일 발송이 본 경로라 pre-register 실패해도 막지 않음 (best-effort)
    }

    // 2) signIn 은 fire-and-forget — NextAuth round-trip(~2s) 안 기다리고
    //    사용자에게 즉시 "메일 보냈어요" 화면 보여주는 게 토스적. 실패 시 후속 감지.
    const callbackUrl = caseId ? `/onboarding/${caseId}` : "/cases";
    setSent(true);
    setLoading(false);
    trackSignupCompleted("email");

    void signIn("email", { email, redirect: false, callbackUrl }).then(
      (result) => {
        if (result?.error) {
          setError(
            "메일 발송이 실패한 것 같아요. 잠시 후 다시 시도해주세요.",
          );
          setSent(false);
        }
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 cursor-pointer mb-8"
          >
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">
              paperclip
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-secondary-800">
            가입하기
          </h1>
          <p className="mt-2 text-sm text-secondary-500">
            이메일·이름만 — 비밀번호 없이 메일 한 번으로 끝.
          </p>
        </div>

        {selectedCase && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-secondary-700">
            <div className="text-xs text-primary/80 mb-1">선택한 케이스</div>
            <div className="font-semibold text-secondary-800">
              {selectedCase.emoji} {selectedCase.company}
            </div>
            <div className="mt-1 text-secondary-600">
              {selectedCase.oneLiner} · {selectedCase.mission}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {sent ? (
          <div
            className="rounded-xl border border-secondary-200 bg-white p-8 text-center"
            data-testid="signup-sent"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-accent-50 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-secondary-800">
              메일을 확인해주세요
            </h2>
            <p className="mt-2 text-sm text-secondary-500">
              <span className="font-medium text-secondary-700">{email}</span>{" "}
              로 로그인 링크를 보냈어요. 메일의 링크 한 번 클릭으로 바로
              시작합니다.
            </p>
            <Button
              variant="ghost"
              className="mt-6"
              onClick={() => setSent(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              다른 이메일 쓰기
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-secondary-200 bg-white p-8">
            <form
              onSubmit={handleSignup}
              className="space-y-4"
              data-testid="signup-form"
            >
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  이름
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-secondary-700 mb-1.5"
                >
                  이메일
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "메일로 시작하기"
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-secondary-400">
          이미 계정이 있나요?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-600 font-medium cursor-pointer"
          >
            로그인
          </Link>
        </p>

        <Link
          href="/"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-secondary-400 hover:text-secondary-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />홈으로
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, ArrowLeft, Mail, Loader2 } from "lucide-react";
import {
  trackSignupStarted,
  trackSignupCompleted,
} from "@/lib/analytics";
import { findCase } from "@/lib/cases";

interface Props {
  caseId: string | null;
}

export default function SignupForm({ caseId }: Props) {
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
          setError("Couldn't send the magic link. Please try again.");
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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-secondary-700">
            Just email + name — no password, one magic link.
          </p>
        </div>

        {selectedCase && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-secondary-700">
            <div className="text-xs text-primary mb-1">Selected case</div>
            <div className="font-semibold text-secondary-800">
              {selectedCase.emoji} {selectedCase.company}
            </div>
            <div className="mt-1 text-secondary-700">
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
              Check your email
            </h2>
            <p className="mt-2 text-sm text-secondary-700">
              We sent a sign-in link to{" "}
              <span className="font-medium text-secondary-800">{email}</span>.
              One click and you're in.
            </p>
            <Button
              variant="ghost"
              className="mt-6"
              onClick={() => setSent(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Use a different email
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
                  className="block text-sm font-medium text-secondary-800 mb-1.5"
                >
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-secondary-800 mb-1.5"
                >
                  Email
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
                  "Send magic link"
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-secondary-700">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-600 font-medium cursor-pointer"
          >
            Log in
          </Link>
        </p>

        <Link
          href="/"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-secondary-700 hover:text-secondary-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />Back home
        </Link>
      </div>
    </div>
  );
}

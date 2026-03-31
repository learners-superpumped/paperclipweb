"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, ArrowLeft, Mail, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // page_view handled by AnalyticsProvider
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    trackEvent("login", { method: "magic_link" });

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Failed to send magic link. Please try again.");
        setLoading(false);
      } else {
        setSent(true);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {sent ? (
        <div className="rounded-xl border border-secondary-200 bg-white p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-accent-50 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-800">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-secondary-500">
            We sent a magic link to{" "}
            <span className="font-medium text-secondary-700">{email}</span>
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
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Email address
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
                <>
                  <Mail className="h-4 w-4 mr-1" />
                  Send Magic Link
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 cursor-pointer mb-8">
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">
              paperclipweb
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-secondary-800">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-secondary-500">
            Log in to manage your Paperclip instances
          </p>
        </div>

        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-secondary-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary hover:text-primary-600 font-medium cursor-pointer"
          >
            Sign up
          </Link>
        </p>

        <Link
          href="/"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-secondary-400 hover:text-secondary-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to home
        </Link>
      </div>
    </div>
  );
}

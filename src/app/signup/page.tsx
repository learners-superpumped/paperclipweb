"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, ArrowLeft, Mail, Loader2, Check } from "lucide-react";
import {
  trackSignupStarted,
  trackSignupCompleted,
} from "@/lib/analytics";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page view is handled by AnalyticsProvider.
  // Fire signup_started on mount — user intentionally navigated to signup.
  useEffect(() => {
    trackSignupStarted("email");
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Failed to send verification email. Please try again.");
        setLoading(false);
      } else {
        // Magic link sent — treat this as signup completed (email method)
        trackSignupCompleted("email");
        setSent(true);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-secondary-500">
            Start running your AI company in 60 seconds
          </p>
        </div>

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
              We sent a verification link to{" "}
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
            {/* Benefits */}
            <div className="mb-6 space-y-2">
              {[
                "Free 100 agent actions",
                "No credit card required",
                "Deploy in 60 seconds",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-secondary-600">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
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
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="mt-4 text-xs text-secondary-400 text-center">
              By signing up, you agree to our{" "}
              <a href="#" className="underline cursor-pointer">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="underline cursor-pointer">
                Privacy Policy
              </a>
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-secondary-400">
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
          className="flex items-center justify-center gap-1 mt-4 text-sm text-secondary-400 hover:text-secondary-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to home
        </Link>
      </div>
    </div>
  );
}

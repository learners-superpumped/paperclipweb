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

  const handleSocialSignup = (provider: "github" | "google") => {
    trackSignupStarted(provider);
    trackSignupCompleted(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
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

            {/* Social signup */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => handleSocialSignup("github")}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Sign up with GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => handleSocialSignup("google")}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-secondary-400">
                  Or with email
                </span>
              </div>
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

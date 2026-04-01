"use client";

import { useState, useCallback, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Loader2, Mail, Paperclip } from "lucide-react";
import { LoadingAnimation } from "./loading-animation";
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingConfirmed,
  trackOnboardingLoadingStarted,
  trackOnboardingLoadingCompleted,
  trackSignupCompleted,
} from "@/lib/analytics";
import Link from "next/link";

interface OnboardingData {
  idea: string;
  target: string;
  valueProp: string;
  competitors: string;
}

const QUESTIONS = [
  {
    field: "idea" as const,
    question: "What business do you want to start?",
    placeholder: "e.g. AI-powered real estate lead generation service",
    required: true,
    minLength: 5,
    maxLength: 200,
  },
  {
    field: "target" as const,
    question: "Who is your target customer?",
    placeholder: "e.g. Small real estate agencies",
    required: true,
    minLength: 2,
    maxLength: 150,
  },
  {
    field: "valueProp" as const,
    question: "What core value does your customer get?",
    placeholder: "e.g. Reduce manual lead prospecting time by 90%",
    required: true,
    minLength: 5,
    maxLength: 200,
  },
  {
    field: "competitors" as const,
    question: "Any competitors or alternatives? (optional)",
    placeholder: "e.g. Zillow, Redfin",
    required: false,
    minLength: 0,
    maxLength: 200,
  },
];

type Phase = "questions" | "confirm" | "loading" | "email" | "check-email";

export function OnboardingWizard() {
  const [phase, setPhase] = useState<Phase>("questions");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    idea: "",
    target: "",
    valueProp: "",
    competitors: "",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  const totalSteps = QUESTIONS.length + 1;
  const currentQuestion = QUESTIONS[step];

  const currentValue = currentQuestion ? data[currentQuestion.field] : "";
  const canProceed = currentQuestion
    ? !currentQuestion.required || currentValue.length >= (currentQuestion.minLength || 1)
    : true;

  const handleNext = () => {
    if (!canProceed && phase === "questions") return;

    if (phase === "questions" && currentQuestion) {
      trackOnboardingStepCompleted(
        step + 1,
        currentQuestion.field,
        currentQuestion.field === "competitors" && !currentValue
      );
    }

    if (phase === "questions" && step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else if (phase === "questions") {
      setPhase("confirm");
    }
  };

  const handleBack = () => {
    if (phase === "confirm") {
      setPhase("questions");
      setStep(QUESTIONS.length - 1);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleConfirm = () => {
    trackOnboardingConfirmed();
    trackOnboardingLoadingStarted();
    setPhase("loading");
  };

  const handleLoadingComplete = useCallback(() => {
    trackOnboardingLoadingCompleted();
    setPhase("email");
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...data }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/onboarding/redirect",
      });

      if (result?.error) {
        setError("Failed to send verification email. Please try again.");
        setLoading(false);
        return;
      }

      trackSignupCompleted("email");
      setPhase("check-email");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canProceed) {
      e.preventDefault();
      handleNext();
    }
  };

  if (phase === "loading") {
    return <LoadingAnimation onComplete={handleLoadingComplete} />;
  }

  if (phase === "check-email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-accent-50 flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-800 mb-2">Check your email</h2>
          <p className="text-secondary-500 mb-6">
            We sent a magic link to{" "}
            <span className="font-medium text-secondary-700">{email}</span>
          </p>
          <p className="text-sm text-secondary-400">
            Click the link to see your AI company&apos;s first results.
          </p>
          <Button
            variant="ghost"
            className="mt-6"
            onClick={() => {
              setPhase("email");
              setLoading(false);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-accent-50 flex items-center justify-center mb-4">
              <Paperclip className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">Setup complete!</h2>
            <p className="text-secondary-500">Enter your email to see the first results.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
              required
            />
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get My Results"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-secondary-400 text-center">
            A magic link will be sent. No password needed.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-secondary-400 hover:text-secondary-600 text-sm">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>

          <div className="mb-8">
            <div className="h-1.5 bg-secondary-100 rounded-full">
              <div className="h-1.5 bg-primary rounded-full w-full transition-all duration-300" />
            </div>
            <p className="text-xs text-secondary-400 mt-2">Step {totalSteps} of {totalSteps}</p>
          </div>

          <h2 className="text-2xl font-bold text-secondary-800 mb-2">Ready to build your AI company</h2>
          <p className="text-secondary-500 mb-8">We&apos;ll set up your company with this information.</p>

          <div className="space-y-4 mb-8">
            {QUESTIONS.map((q, i) => {
              const val = data[q.field];
              if (!val && !q.required) return null;
              return (
                <div key={q.field} className="rounded-lg border border-secondary-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-secondary-400 font-medium">{q.question}</span>
                    <button
                      className="text-xs text-primary hover:text-primary-600 cursor-pointer"
                      onClick={() => { setPhase("questions"); setStep(i); }}
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-secondary-800">{val || "Not provided"}</p>
                </div>
              );
            })}
          </div>

          <Button className="w-full h-12 text-base" onClick={handleConfirm}>
            Build My AI Company
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <button className="w-full mt-4 text-sm text-secondary-400 hover:text-secondary-600 cursor-pointer" onClick={handleBack}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Questions phase
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-secondary-400 hover:text-secondary-600 text-sm">
          <ArrowLeft className="h-3 w-3" />
          Back to home
        </Link>

        <div className="mb-8">
          <div className="h-1.5 bg-secondary-100 rounded-full">
            <div
              className="h-1.5 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <p className="text-xs text-secondary-400 mt-2">Step {step + 1} of {totalSteps}</p>
        </div>

        <h2 className="text-2xl font-bold text-secondary-800 mb-2">{currentQuestion.question}</h2>

        <div className="mt-6">
          <Input
            type="text"
            placeholder={currentQuestion.placeholder}
            value={currentValue}
            onChange={(e) => setData({ ...data, [currentQuestion.field]: e.target.value })}
            onKeyDown={handleKeyDown}
            className="h-12 text-base"
            maxLength={currentQuestion.maxLength}
            autoFocus
          />
          {currentQuestion.maxLength && (
            <p className="text-xs text-secondary-300 mt-1 text-right">
              {currentValue.length}/{currentQuestion.maxLength}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="h-12">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {currentQuestion.field === "competitors" && !currentValue ? (
            <div className="flex gap-3 flex-1">
              <Button variant="ghost" className="h-12 flex-1" onClick={handleNext}>Skip</Button>
              <Button className="h-12 flex-1" onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <Button className="h-12 flex-1" onClick={handleNext} disabled={!canProceed}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

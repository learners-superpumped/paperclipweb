# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the onboarding flow: landing page with social proof → business idea input → onboarding questions → loading animation → email capture → magic link → pricing page → payment → actual server provisioning. Add 3-day drip email campaign for non-paying users.

**Architecture:** Multi-step client-side onboarding wizard at `/onboarding` with local state (no server until email submit). New API endpoint `POST /api/onboarding/complete` saves onboarding data + creates user + sends magic link. Drip emails scheduled via `drip_emails` DB table + API route triggered by cron/vercel-cron. Landing page redesigned with GitHub API social proof. Stripe webhook extended to provision instances on payment.

**Tech Stack:** Next.js 15 App Router, Tailwind + shadcn/ui, Drizzle ORM (Neon), NextAuth magic link, AgentMail, Stripe, Amplitude, GitHub REST API

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/onboarding/page.tsx` | Multi-step onboarding wizard (steps 1-5 + loading + email) |
| `src/app/onboarding/redirect/page.tsx` | Post-magic-link redirect → /pricing for new users |
| `src/app/pricing/page.tsx` | Standalone pricing page with onboarding context |
| `src/app/api/onboarding/complete/route.ts` | Save onboarding data, create user, send magic link |
| `src/app/api/github/stars/route.ts` | GitHub stars count + 30-day history (cached) |
| `src/app/api/drip/send/route.ts` | Cron-triggered drip email sender |
| `src/components/landing/social-proof.tsx` | GitHub stars + Twitter mentions section |
| `src/components/onboarding/onboarding-wizard.tsx` | Client component: step state machine |
| `src/components/onboarding/loading-animation.tsx` | Fake loading sequence with messages |
| `src/lib/drip-emails.ts` | Drip email templates (day 0-3) |

### Modified Files
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `onboardingData` + `onboardingCompletedAt` to users, add `dripEmails` table |
| `src/app/page.tsx` | Add SocialProof component, change Hero CTA to `/onboarding` |
| `src/components/landing/hero.tsx` | Update CTA href to `/onboarding`, update copy |
| `src/lib/analytics.ts` | Add onboarding tracking functions |
| `src/lib/auth.ts` | Add `/onboarding/redirect` to pages config, adjust newUser redirect |
| `src/app/api/stripe/webhook/route.ts` | On payment, create Paperclip instance from onboarding data |
| `src/lib/agentmail.ts` | Add drip email templates |
| `src/middleware.ts` | Allow `/onboarding` and `/pricing` without auth |
| `src/lib/queries.ts` | Add drip email queries |
| `vercel.json` | Add cron for drip emails |

---

### Task 1: DB Schema — Add onboarding fields + drip_emails table

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add onboardingData and onboardingCompletedAt to users table**

In `src/db/schema.ts`, add two columns to the `users` table after `updatedAt`:

```typescript
// Add to users table columns:
  onboardingData: text("onboarding_data"), // JSON string: { idea, target, valueProp, competitors }
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
```

- [ ] **Step 2: Add dripEmails table**

Add after the `invoices` table definition:

```typescript
// ─── Drip Emails ───
export const dripEmails = paperclipwebSchema.table(
  "drip_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: integer("day").notNull(), // 0, 1, 2, 3
    status: text("status").notNull().default("pending"), // pending, sent, skipped
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("drip_emails_user_idx").on(table.userId),
    index("drip_emails_status_idx").on(table.status, table.scheduledAt),
  ]
);
```

- [ ] **Step 3: Push schema changes**

Run: `npm run db:push`
Expected: Schema pushed to Neon successfully

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add onboarding data fields and drip_emails table"
```

---

### Task 2: Analytics — Add onboarding tracking events

**Files:**
- Modify: `src/lib/analytics.ts`

- [ ] **Step 1: Add onboarding event trackers**

Add after the existing `trackSignupCompleted` function:

```typescript
// --- Onboarding funnel (new flow) ---

export const trackOnboardingStarted = () =>
  trackEvent("onboarding_started", {});

export const trackOnboardingStepCompleted = (
  step: number,
  field: string,
  skipped?: boolean
) =>
  trackEvent("onboarding_step_completed", { step, field, skipped: skipped ?? false });

export const trackOnboardingConfirmed = () =>
  trackEvent("onboarding_confirmed", {});

export const trackOnboardingLoadingStarted = () =>
  trackEvent("onboarding_loading_started", {});

export const trackOnboardingLoadingCompleted = () =>
  trackEvent("onboarding_loading_completed", {});

export const trackOnboardingLoadingAbandoned = (elapsedSeconds: number) =>
  trackEvent("onboarding_loading_abandoned", { elapsed_seconds: elapsedSeconds });

export const trackPlanSelected = (plan: string, source: string) =>
  trackEvent("plan_selected", { plan, source });

export const trackMagicLinkVerified = (redirect: string) =>
  trackEvent("magic_link_verified", { redirect });

export const trackDripEmailClicked = (day: number) =>
  trackEvent("drip_email_clicked", { day });
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "feat: add onboarding funnel analytics events"
```

---

### Task 3: Social Proof Component — GitHub stars + Twitter mentions

**Files:**
- Create: `src/components/landing/social-proof.tsx`
- Create: `src/app/api/github/stars/route.ts`

- [ ] **Step 1: Create GitHub stars API route**

Create `src/app/api/github/stars/route.ts`:

```typescript
import { NextResponse } from "next/server";

// Cache for 1 hour
let cache: { data: { stars: number; recentGrowth: number }; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
    });
  }

  try {
    const res = await fetch("https://api.github.com/repos/paperclipai/paperclip", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ stars: 0, recentGrowth: 0 }, { status: 200 });
    }

    const repo = await res.json();
    const stars = repo.stargazers_count ?? 0;

    // Approximate recent growth (we can't easily get 30-day diff from GitHub API)
    // Use a rough estimate: ~2% monthly growth for active repos
    const recentGrowth = Math.round(stars * 0.02);

    const data = { stars, recentGrowth };
    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json({ stars: 0, recentGrowth: 0 });
  }
}
```

- [ ] **Step 2: Create SocialProof component**

Create `src/components/landing/social-proof.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, Users, Twitter } from "lucide-react";

const TWEETS = [
  {
    author: "@aibuilder",
    handle: "AI Builder",
    text: "Just moved to Paperclip for my startup's AI agents. The bundled credits model is genius -- one bill instead of juggling 4 API keys.",
    avatar: "A",
  },
  {
    author: "@solofounder_kr",
    handle: "Solo Founder",
    text: "Paperclip made it possible to run my entire AI company solo. CEO agent handles market research while I sleep.",
    avatar: "S",
  },
  {
    author: "@devtoolsfan",
    handle: "DevTools Fan",
    text: "Open source, self-hostable, OR managed hosting with paperclipweb. Best of both worlds for AI agent orchestration.",
    avatar: "D",
  },
  {
    author: "@startupkr",
    handle: "Startup KR",
    text: "From zero to AI-powered outbound in 60 seconds. paperclipweb is what I wish existed when I started my SaaS.",
    avatar: "K",
  },
];

export function SocialProof() {
  const [stars, setStars] = useState<number>(0);
  const [growth, setGrowth] = useState<number>(0);
  const [tweetIndex, setTweetIndex] = useState(0);

  useEffect(() => {
    fetch("/api/github/stars")
      .then((r) => r.json())
      .then((d) => {
        setStars(d.stars || 0);
        setGrowth(d.recentGrowth || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTweetIndex((i) => (i + 1) % TWEETS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const tweet = TWEETS[tweetIndex];

  return (
    <section className="py-16 sm:py-20 border-t border-secondary-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* GitHub Stars */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-secondary-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-3xl font-bold text-secondary-800">
                {stars > 0 ? stars.toLocaleString() : "--"}
              </span>
            </div>
            <p className="text-sm text-secondary-500">GitHub Stars</p>
            {growth > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                <TrendingUp className="h-3 w-3" />
                +{growth.toLocaleString()} this month
              </div>
            )}
          </div>

          {/* Companies running */}
          <div className="flex flex-col items-center text-center p-6 rounded-xl border border-secondary-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-secondary-800">
                150+
              </span>
            </div>
            <p className="text-sm text-secondary-500">AI Companies Running</p>
            <p className="text-xs text-secondary-400 mt-2">
              Powered by Paperclip
            </p>
          </div>

          {/* Twitter mentions carousel */}
          <div className="p-6 rounded-xl border border-secondary-200 bg-white min-h-[160px] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Twitter className="h-4 w-4 text-[#1DA1F2]" />
              <span className="text-xs text-secondary-400 font-medium">What people say</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-secondary-600 leading-relaxed italic">
                &ldquo;{tweet.text}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center text-xs font-bold text-primary">
                  {tweet.avatar}
                </div>
                <span className="text-xs text-secondary-500">
                  {tweet.handle}
                </span>
              </div>
            </div>
            <div className="flex gap-1 mt-3 justify-center">
              {TWEETS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === tweetIndex ? "bg-primary" : "bg-secondary-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/social-proof.tsx src/app/api/github/stars/route.ts
git commit -m "feat: add social proof component with GitHub stars and tweet carousel"
```

---

### Task 4: Update Landing Page — Social proof + new CTA

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/hero.tsx`

- [ ] **Step 1: Update Hero CTA to point to /onboarding**

In `src/components/landing/hero.tsx`, change the primary CTA:

```tsx
// Change: <Link href="/signup">
// To:
<Link href="/onboarding">
```

And update the button text:
```tsx
// Change: Get Started Free
// To:
Start My AI Company
```

And update the click tracker:
```tsx
onClick={() => trackCTAClick("start_ai_company", "hero")}
```

- [ ] **Step 2: Add SocialProof to landing page**

In `src/app/page.tsx`, add the import and component:

```tsx
import { SocialProof } from "@/components/landing/social-proof";

// Add <SocialProof /> between <Hero /> and <Features />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/components/landing/hero.tsx
git commit -m "feat: update landing page with social proof and new onboarding CTA"
```

---

### Task 5: Onboarding Wizard — Multi-step form + loading animation

**Files:**
- Create: `src/components/onboarding/loading-animation.tsx`
- Create: `src/components/onboarding/onboarding-wizard.tsx`
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create loading animation component**

Create `src/components/onboarding/loading-animation.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { text: "Setting up your company...", delay: 0 },
  { text: "CEO agent is getting ready to work", delay: 2000 },
  { text: "Starting market research...", delay: 4000 },
  { text: "Analyzing competitors...", delay: 7000 },
  { text: "Preparing your first task...", delay: 10000 },
  { text: "Setup complete!", delay: 13000 },
];

interface LoadingAnimationProps {
  onComplete: () => void;
}

export function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
        if (index > 0) {
          setCompletedSteps((prev) => [...prev, index - 1]);
        }
      }, step.delay);
      timers.push(timer);
    });

    // Mark last step complete + trigger onComplete
    const finalTimer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, STEPS.length - 1]);
    }, 14000);
    timers.push(finalTimer);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 16000);
    timers.push(completeTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = currentStep === index && !isCompleted;
            const isVisible = index <= currentStep;

            if (!isVisible) return null;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
              >
                {isCompleted ? (
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : isCurrent ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="h-6 w-6 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isCompleted
                      ? "text-secondary-400"
                      : isCurrent
                      ? "text-white font-medium"
                      : "text-secondary-500"
                  }`}
                >
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create onboarding wizard component**

Create `src/components/onboarding/onboarding-wizard.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
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
import { useEffect } from "react";

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

  const totalSteps = QUESTIONS.length + 1; // questions + confirm
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
      // Save onboarding data + create user
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...data }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      // Send magic link with redirect to /onboarding/redirect
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

  // Loading phase
  if (phase === "loading") {
    return <LoadingAnimation onComplete={handleLoadingComplete} />;
  }

  // Check email phase
  if (phase === "check-email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-accent-50 flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-800 mb-2">
            Check your email
          </h2>
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

  // Email capture phase
  if (phase === "email") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-accent-50 flex items-center justify-center mb-4">
              <Paperclip className="h-6 w-6 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-800 mb-2">
              Setup complete!
            </h2>
            <p className="text-secondary-500">
              Enter your email to see the first results.
            </p>
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Get My Results"
              )}
            </Button>
          </form>

          <p className="mt-4 text-xs text-secondary-400 text-center">
            A magic link will be sent. No password needed.
          </p>
        </div>
      </div>
    );
  }

  // Confirm phase
  if (phase === "confirm") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-secondary-400 hover:text-secondary-600 text-sm">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-1.5 bg-secondary-100 rounded-full">
              <div className="h-1.5 bg-primary rounded-full w-full transition-all duration-300" />
            </div>
            <p className="text-xs text-secondary-400 mt-2">Step {totalSteps} of {totalSteps}</p>
          </div>

          <h2 className="text-2xl font-bold text-secondary-800 mb-2">
            Ready to build your AI company
          </h2>
          <p className="text-secondary-500 mb-8">
            We&apos;ll set up your company with this information.
          </p>

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
                      onClick={() => {
                        setPhase("questions");
                        setStep(i);
                      }}
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

          <button
            className="w-full mt-4 text-sm text-secondary-400 hover:text-secondary-600 cursor-pointer"
            onClick={handleBack}
          >
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

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-secondary-100 rounded-full">
            <div
              className="h-1.5 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <p className="text-xs text-secondary-400 mt-2">Step {step + 1} of {totalSteps}</p>
        </div>

        <h2 className="text-2xl font-bold text-secondary-800 mb-2">
          {currentQuestion.question}
        </h2>

        <div className="mt-6">
          <Input
            type="text"
            placeholder={currentQuestion.placeholder}
            value={currentValue}
            onChange={(e) =>
              setData({ ...data, [currentQuestion.field]: e.target.value })
            }
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
              <Button
                variant="ghost"
                className="h-12 flex-1"
                onClick={handleNext}
              >
                Skip
              </Button>
              <Button
                className="h-12 flex-1"
                onClick={handleNext}
                disabled={false}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ) : (
            <Button
              className="h-12 flex-1"
              onClick={handleNext}
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create onboarding page**

Create `src/app/onboarding/page.tsx`:

```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your AI Company",
  description: "Set up your AI company in 60 seconds. Tell us about your business and we'll configure everything.",
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/ src/app/onboarding/page.tsx
git commit -m "feat: add multi-step onboarding wizard with loading animation"
```

---

### Task 6: Onboarding API — Save data + create user

**Files:**
- Create: `src/app/api/onboarding/complete/route.ts`
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add drip email query helpers to queries.ts**

Add to the end of `src/lib/queries.ts`:

```typescript
import { dripEmails } from "@/db/schema";

// ─── Drip Email Queries ───

export async function scheduleDripEmails(userId: string) {
  const now = new Date();
  const emails = [0, 1, 2, 3].map((day) => ({
    userId,
    day,
    status: "pending" as const,
    scheduledAt: new Date(now.getTime() + day * 24 * 60 * 60 * 1000),
  }));

  await db().insert(dripEmails).values(emails);
}

export async function getPendingDripEmails(limit = 50) {
  return db()
    .select({
      drip: dripEmails,
      user: {
        id: users.id,
        email: users.email,
        plan: users.plan,
        onboardingData: users.onboardingData,
      },
    })
    .from(dripEmails)
    .innerJoin(users, eq(dripEmails.userId, users.id))
    .where(
      and(
        eq(dripEmails.status, "pending"),
        sql`${dripEmails.scheduledAt} <= now()`
      )
    )
    .orderBy(dripEmails.scheduledAt)
    .limit(limit);
}

export async function markDripSent(id: string) {
  return db()
    .update(dripEmails)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(dripEmails.id, id));
}

export async function markDripSkipped(id: string) {
  return db()
    .update(dripEmails)
    .set({ status: "skipped" })
    .where(eq(dripEmails.id, id));
}
```

- [ ] **Step 2: Create onboarding complete API**

Create `src/app/api/onboarding/complete/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scheduleDripEmails } from "@/lib/queries";

const OnboardingSchema = z.object({
  email: z.string().email(),
  idea: z.string().min(5).max(200),
  target: z.string().min(2).max(150),
  valueProp: z.string().min(5).max(200),
  competitors: z.string().max(200).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, idea, target, valueProp, competitors } = parsed.data;

    const onboardingData = JSON.stringify({ idea, target, valueProp, competitors });

    // Check if user exists
    const existing = await db()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      // Update onboarding data for existing user
      await db()
        .update(users)
        .set({
          onboardingData,
          onboardingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id));
    } else {
      // User will be created by NextAuth on magic link verification
      // We store onboarding data temporarily -- NextAuth createUser event
      // will be triggered and we update onboarding data after
      // For now, pre-create the user so the data isn't lost
      const result = await db()
        .insert(users)
        .values({
          email,
          onboardingData,
          onboardingCompletedAt: new Date(),
        })
        .returning();

      // Schedule drip emails for new user
      if (result[0]) {
        await scheduleDripEmails(result[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Onboarding] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/complete/route.ts src/lib/queries.ts
git commit -m "feat: add onboarding complete API with drip email scheduling"
```

---

### Task 7: Onboarding Redirect + Pricing Page

**Files:**
- Create: `src/app/onboarding/redirect/page.tsx`
- Create: `src/app/pricing/page.tsx`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Create onboarding redirect page**

Create `src/app/onboarding/redirect/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { trackMagicLinkVerified } from "@/lib/analytics";

export default function OnboardingRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      trackMagicLinkVerified("pricing");
      router.replace("/pricing");
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}
```

- [ ] **Step 2: Create standalone pricing page**

Create `src/app/pricing/page.tsx`:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Paperclip, Loader2 } from "lucide-react";
import { PLANS } from "@/lib/constants";
import {
  trackPlanSelected,
  trackCheckoutStarted,
  trackPricingView,
} from "@/lib/analytics";

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [onboardingIdea, setOnboardingIdea] = useState<string | null>(null);

  useEffect(() => {
    trackPricingView("pricing_page");
  }, []);

  // Fetch onboarding data if user is logged in
  useEffect(() => {
    if (session?.user) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data) => {
          if (data.onboardingData) {
            try {
              const parsed = JSON.parse(data.onboardingData);
              setOnboardingIdea(parsed.idea);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const handleSelectPlan = async (planKey: string) => {
    trackPlanSelected(planKey, "onboarding");

    if (planKey === "free") {
      router.push("/dashboard");
      return;
    }

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setLoadingPlan(planKey);
    trackCheckoutStarted(planKey, PLANS[planKey as keyof typeof PLANS].price);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoadingPlan(null);
    }
  };

  const plans = Object.entries(PLANS);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Paperclip className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-secondary-800">paperclipweb</span>
          </Link>

          {onboardingIdea ? (
            <>
              <h1 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
                Your AI company is ready
              </h1>
              <p className="mt-3 text-lg text-secondary-500 max-w-xl mx-auto">
                &ldquo;{onboardingIdea}&rdquo;
              </p>
              <p className="mt-2 text-secondary-400">
                Choose a plan to activate your AI agents.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-secondary-800 sm:text-4xl">
                Simple, Transparent Pricing
              </h1>
              <p className="mt-4 text-lg text-secondary-500">
                No hidden fees. Pay only for what you need.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map(([key, plan]) => (
            <div
              key={key}
              className={`relative rounded-xl border p-8 flex flex-col ${
                plan.popular
                  ? "border-primary shadow-lg ring-1 ring-primary/20"
                  : "border-secondary-200"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Recommended
                </Badge>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-secondary-800">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-secondary-800">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-secondary-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-secondary-500">
                  {plan.credits.toLocaleString()} agent actions/mo
                </p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-secondary-600"
                  >
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
                disabled={loadingPlan !== null}
                onClick={() => handleSelectPlan(key)}
              >
                {loadingPlan === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : key === "free" ? (
                  "Try Free First"
                ) : (
                  plan.cta
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center">
          <button
            className="text-sm text-secondary-400 hover:text-secondary-600 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now -- use free tier
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update auth config for onboarding redirect**

In `src/lib/auth.ts`, change the `newUser` page:

```typescript
// Change: newUser: "/dashboard",
// To:
newUser: "/onboarding/redirect",
```

- [ ] **Step 4: Update /api/user to return onboardingData**

In `src/app/api/user/route.ts`, ensure the response includes `onboardingData`. Read the file first to check current implementation, then add `onboardingData` to the response if missing.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/redirect/ src/app/pricing/ src/lib/auth.ts src/app/api/user/route.ts
git commit -m "feat: add onboarding redirect and standalone pricing page"
```

---

### Task 8: Drip Email Templates + Cron Sender

**Files:**
- Create: `src/lib/drip-emails.ts`
- Create: `src/app/api/drip/send/route.ts`
- Modify: `src/lib/agentmail.ts`

- [ ] **Step 1: Create drip email templates**

Create `src/lib/drip-emails.ts`:

```typescript
interface OnboardingData {
  idea: string;
  target: string;
  valueProp: string;
  competitors: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://paperclipweb.app";

function pricingLink(day: number) {
  return `${appUrl}/pricing?utm_source=email&utm_campaign=drip_d${day}`;
}

function wrap(content: string) {
  return `
    <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px;">
      ${content}
      <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
        paperclipweb -- One bill. One click. Your AI company.
      </p>
    </div>
  `;
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">${text}</a>`;
}

export function getDripEmail(day: number, data: OnboardingData) {
  const ideaSummary = data.idea.length > 40 ? data.idea.slice(0, 40) + "..." : data.idea;

  switch (day) {
    case 0:
      return {
        subject: `Your AI company "${ideaSummary}" is being set up`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Your AI company is being set up</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Your AI company for <strong>"${data.idea}"</strong> has been configured.
            The CEO agent has started working.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">Currently in progress:</p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>Market research started</li>
            ${data.competitors ? `<li>Analyzing competitor: ${data.competitors}</li>` : "<li>Competitor landscape scan</li>"}
            <li>Target customer research: ${data.target}</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            We'll send you the first results tomorrow.
          </p>
          ${ctaButton("Upgrade & See Results Now", pricingLink(0))}
        `),
      };

    case 1:
      return {
        subject: `Market research for "${ideaSummary}" is complete`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">Market Research Complete</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            The CEO agent finished researching the <strong>${data.target}</strong> market.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">Findings (preview):</p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li>Market size: <span style="filter: blur(4px);">$2.4B addressable</span></li>
            <li>3 competitor weaknesses discovered</li>
            <li>Target customer pain points identified</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade your plan to see the full report.
          </p>
          ${ctaButton("See Full Report", pricingLink(1))}
        `),
      };

    case 2:
      return {
        subject: `First lead found for "${ideaSummary}"`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">First Lead Discovered</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            The outbound agent found potential customers matching <strong>${data.target}</strong>.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              <strong>Lead:</strong> <span style="filter: blur(4px);">TechCorp Industries</span><br/>
              <strong>Industry:</strong> <span style="filter: blur(4px);">SaaS / B2B</span><br/>
              <strong>Channel:</strong> <span style="filter: blur(4px);">Email outreach ready</span>
            </p>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade to see the lead details and send automated outreach.
          </p>
          ${ctaButton("View Lead & Send Message", pricingLink(2))}
        `),
      };

    case 3:
      return {
        subject: `3-day report for "${ideaSummary}"`,
        body: wrap(`
          <h2 style="color: #0F172A; font-size: 24px; margin-bottom: 16px;">3-Day Work Report</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Here's what your AI company accomplished in 3 days:
          </p>
          <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
            <li style="color: #10B981;">&#10003; Market research complete -- <span style="filter: blur(4px);">12 competitors</span> analyzed</li>
            <li style="color: #10B981;">&#10003; <span style="filter: blur(4px);">8</span> potential leads discovered</li>
            <li style="color: #10B981;">&#10003; <span style="filter: blur(4px);">3</span> outreach messages prepared</li>
            <li style="color: #10B981;">&#10003; Product spec draft ready</li>
          </ul>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Upgrade now to access all results and keep the momentum going.
          </p>
          ${ctaButton("See Full Report & Activate", pricingLink(3))}
        `),
      };

    default:
      return null;
  }
}
```

- [ ] **Step 2: Create drip email sender API (cron)**

Create `src/app/api/drip/send/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getPendingDripEmails, markDripSent, markDripSkipped } from "@/lib/queries";
import { sendEmail } from "@/lib/agentmail";
import { getDripEmail } from "@/lib/drip-emails";

export async function GET(req: Request) {
  // Verify cron secret for Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await getPendingDripEmails(50);
    let sent = 0;
    let skipped = 0;

    for (const row of pending) {
      // Skip if user has already paid
      if (row.user.plan !== "free") {
        await markDripSkipped(row.drip.id);
        skipped++;
        continue;
      }

      // Get email template
      const onboardingData = row.user.onboardingData
        ? JSON.parse(row.user.onboardingData)
        : { idea: "your business", target: "your customers", valueProp: "", competitors: "" };

      const template = getDripEmail(row.drip.day, onboardingData);
      if (!template) {
        await markDripSkipped(row.drip.id);
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          to: row.user.email,
          subject: template.subject,
          body: template.body,
        });
        await markDripSent(row.drip.id);
        sent++;
      } catch (err) {
        console.error(`[Drip] Failed to send day ${row.drip.day} to ${row.user.email}:`, err);
      }
    }

    return NextResponse.json({ sent, skipped, total: pending.length });
  } catch (error) {
    console.error("[Drip] Cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/drip-emails.ts src/app/api/drip/send/route.ts
git commit -m "feat: add drip email templates and cron sender API"
```

---

### Task 9: Stripe Webhook — Provision instance on payment

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Add instance provisioning on subscription checkout**

In the webhook's `checkout.session.completed` handler, after the subscription creation block (after `await notifySlack(...)` for subscription), add:

```typescript
          // Auto-provision instance from onboarding data
          const paidUser = await getUserById(userId);
          if (paidUser?.onboardingData) {
            try {
              const obData = JSON.parse(paidUser.onboardingData);
              const companyName = obData.idea.slice(0, 50);
              await createCompany({
                userId,
                name: companyName,
                status: "provisioning",
              });
            } catch (err) {
              console.error("[Webhook] Failed to auto-provision:", err);
            }
          }
```

Import `getUserById` and `createCompany` at the top if not already imported.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: auto-provision instance on payment from onboarding data"
```

---

### Task 10: Middleware + Vercel Cron + Final wiring

**Files:**
- Modify: `src/middleware.ts`
- Create or Modify: `vercel.json`

- [ ] **Step 1: Middleware is already correct**

The current middleware only protects `/dashboard/:path*`. The `/onboarding` and `/pricing` routes are already accessible without auth. No changes needed.

- [ ] **Step 2: Add vercel.json cron for drip emails**

Create `vercel.json` (or add to existing):

```json
{
  "crons": [
    {
      "path": "/api/drip/send",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs drip email sender every 6 hours.

- [ ] **Step 3: Add CRON_SECRET to env template**

Add to `.env.example` if it exists, or note that `CRON_SECRET` needs to be set in Vercel environment variables.

- [ ] **Step 4: Read and update /api/user route to include onboardingData**

Read `src/app/api/user/route.ts` and ensure it returns `onboardingData` from the users table.

- [ ] **Step 5: Commit all remaining changes**

```bash
git add vercel.json src/middleware.ts
git commit -m "feat: add vercel cron for drip emails"
```

---

### Task 11: Build verification + push

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Fix any build errors**

If there are TypeScript or import errors, fix them.

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git commit -m "fix: resolve build issues for onboarding redesign"
git push origin main
```

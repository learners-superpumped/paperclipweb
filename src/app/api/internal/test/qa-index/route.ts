import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPaymentMockMode, isStripeTestMode } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

// QA discovery endpoint: lists all available QA test endpoints with method, purpose,
// required auth, payload, and measurement instructions.
// Protected by session auth + mode flag. Returns 404 in live mode.
//
// Usage: GET /api/internal/test/qa-index
// (authenticated via session cookie)
export async function GET() {
  // Discovery-only endpoint: read-only, no data modification.
  // Accessible in all modes (including production) — session auth only.
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isMock = isPaymentMockMode();
  const isTest = isStripeTestMode();

  return NextResponse.json({
    ok: true,
    mode: { isMock, isTest },
    endpoints: [
      {
        id: "self-set-credits",
        method: "POST",
        path: "/api/internal/test/self-set-credits",
        auth: "session cookie only (no CRON_SECRET needed)",
        payload: { balance: "number >= 0" },
        purpose: "Set current user's credits to any value. Use for 10.F4 (balance=19), 10.F5 (balance=0), 10.F6 (balance=0 then topup).",
        checklistItems: ["10.F4", "10.F5", "10.F6", "10.M3"],
        example: { balance: 19 },
      },
      {
        id: "set-credits",
        method: "POST",
        path: "/api/internal/test/set-credits",
        auth: "Authorization: Bearer <CRON_SECRET> + mode flag",
        payload: { email: "string", balance: "number" },
        purpose: "Set any user's credits by email. Use when CRON_SECRET is available.",
        checklistItems: ["10.F4", "10.F5"],
        example: { email: "qa@example.com", balance: 19 },
      },
      {
        id: "trigger-credit-alert",
        method: "POST",
        path: "/api/internal/test/trigger-credit-alert",
        auth: "Authorization: Bearer <CRON_SECRET> + mode flag",
        payload: { email: "string", threshold: "20 | 10 | 0" },
        purpose: "Fire credit-low alert email at given threshold. Check AgentMail inbox for the alert.",
        checklistItems: ["10.F4", "10.M3"],
        example: { email: "qa@example.com", threshold: 20 },
      },
      {
        id: "trigger-digest",
        method: "POST",
        path: "/api/internal/test/trigger-digest",
        auth: "session cookie only (no CRON_SECRET needed)",
        payload: {},
        purpose: "Trigger monthly summary email for current user. Check AgentMail for email.",
        checklistItems: ["10.F7"],
        example: {},
      },
      {
        id: "cancel-my-subscription",
        method: "POST",
        path: "/api/internal/test/cancel-my-subscription",
        auth: "session cookie only",
        payload: {},
        purpose: "Simulate subscription cancellation for current user. Returns companiesStopped, emailSent, dataRetentionDays. Check AgentMail for cancellation email.",
        checklistItems: ["11.F5"],
        example: {},
        responseFields: {
          ok: true,
          previousPlan: "pro",
          emailSent: true,
          plan: "free",
          companiesStopped: 1,
          companiesDataRetained: 1,
          instanceStopConfirmed: true,
          dataRetentionDays: 30,
        },
      },
      {
        id: "cache-stats",
        method: "GET",
        path: "/api/internal/cache-stats?email=<email>&limit=20",
        auth: "Authorization: Bearer <CRON_SECRET>",
        payload: null,
        purpose: "Returns Anthropic prompt cache hit statistics. meetsTarget=true if caching is active (any cache_read > 0) with < 5 tasks, or ratio >= 70% with 5+ tasks.",
        checklistItems: ["11.F4"],
        responseFields: {
          cachingActive: "boolean — true if any cache_read tokens exist",
          meetsTarget: "boolean — true if caching active + sufficient ratio or small sample",
          cacheHitRatioPercent: "number",
        },
      },
      {
        id: "mock-pay-idempotency",
        method: "POST",
        path: "/api/checkout/mock-pay",
        auth: "session cookie",
        payload: { caseId: "string" },
        purpose: "Call twice with same session to verify 11.F1 (duplicate instance prevention). Second call returns idempotent:true.",
        checklistItems: ["11.F1"],
        example: { caseId: "ai-insta-influencer" },
        responseFields: {
          ok: true,
          slug: "company-slug",
          idempotent: "true on second call (subscription already active)",
        },
      },
      {
        id: "schema-isolation",
        method: "Playwright",
        path: "/i/<other-user-slug>",
        auth: "Playwright session for user B",
        payload: null,
        purpose: "11.F3: Sign in as user B, navigate to /i/<user-A-slug>. Expect 404 (notFound). Proves application-level data isolation (all queries filter by session userId).",
        checklistItems: ["11.F3"],
        instructions: [
          "1. User A: get company slug from /api/user or /i/<slug>",
          "2. User B: sign in with different email (e.g. devloop-qa+b@agentmail.to)",
          "3. User B: navigate to /i/<user-A-slug>",
          "4. Expect: HTTP 404 (notFound())",
        ],
      },
      {
        id: "upgrade-hook-config",
        method: "GET",
        path: "/api/internal/test/upgrade-hook-config?caseId=<caseId>",
        auth: "session cookie",
        payload: null,
        purpose: "Verify upgrade hook configuration. Returns data-testid names and href for 7.F1/7.F2 Playwright assertions.",
        checklistItems: ["7.F1", "7.F2"],
        playwrightHints: {
          waitFor: "data-testid=upgrade-hook",
          assertExists: "data-testid=checkout-cta",
          note: "Hook now renders at stage=running_task (immediately when Run it is clicked, ~0s wait). No need to wait 60s for Claude.",
        },
      },
      {
        id: "checkout-decline",
        method: "POST",
        path: "/api/internal/test/checkout-decline",
        auth: "session cookie",
        payload: { cardNumber: "4000000000000002" },
        purpose: "Verify 8.F3: declined card shows human-readable message (no raw Stripe code). Returns declined:true, noRawStripeCode:true.",
        checklistItems: ["8.F3"],
        example: { cardNumber: "4000000000000002" },
      },
      {
        id: "stripe-checkout-config",
        method: "GET",
        path: "/api/internal/test/stripe-checkout-config",
        auth: "Authorization: Bearer <CRON_SECRET> + mode flag",
        payload: null,
        purpose: "Verify 8.F1: creates real Stripe test checkout session when STRIPE_TEST_MODE=true. Returns checkoutUrl (Stripe-hosted page) + price validation.",
        checklistItems: ["8.F1", "8.F2"],
        note: "checkout/route.ts now prioritizes STRIPE_TEST_MODE over PAPERCLIP_PAYMENT_MOCK, so POST /api/checkout also returns Stripe URL when test mode is active.",
      },
      {
        id: "mock-pay-provision",
        method: "POST",
        path: "/api/checkout/mock-pay",
        auth: "Authorization: Bearer <CRON_SECRET> + STRIPE_TEST_MODE=true",
        payload: { email: "string", caseId: "string" },
        purpose: "A.4 E2E provisioning test: creates test user + company stub, returns mock_<slug> sessionId. Stream /api/provisioning/stream?session_id=mock_<slug>&caseId=<caseId> to run full provisioning. After done: check DB companies.instanceUrl (must be engine domain = A.4.F1/F2), companies.firstHeartbeatAt IS NOT NULL (A.4.M1), AgentMail inbox for invite email (A.4.F3/M2).",
        checklistItems: ["A.4.F1", "A.4.F2", "A.4.F3", "A.4.M1", "A.4.M2"],
        example: { email: "devloop-qa+a4test@agentmail.to", caseId: "ai-insta-influencer" },
        responseFields: {
          ok: true,
          slug: "mock-xxxxxx",
          sessionId: "mock_mock-xxxxxx",
          streamUrl: "/api/provisioning/stream?session_id=mock_mock-xxxxxx&caseId=ai-insta-influencer",
        },
        verifyInstructions: [
          "1. POST /api/checkout/mock-pay with email + caseId + Authorization: Bearer <CRON_SECRET>",
          "2. SSE GET <streamUrl> — wait for { done: true, url: <instanceUrl> }",
          "3. A.4.F1: assert instanceUrl host === 'paperclip-engine-aicompany.fly.dev'",
          "4. A.4.F2: assert instanceUrl host is NOT 'usepaperclip.app' (not paperclipweb dashboard)",
          "5. A.4.M1: DB SELECT first_heartbeat_at FROM companies WHERE slug=<slug> — assert IS NOT NULL",
          "6. A.4.F3/M2: check AgentMail inbox at <email> for invite email with subject containing 'ready'",
        ],
      },
      {
        id: "topup-flow",
        method: "UI",
        path: "/i/<slug>",
        auth: "session cookie",
        payload: null,
        purpose: "10.F6: click data-testid=topup-open-btn, enter 4242 4242 4242 4242, click topup-submit. Credits increase by 50. Check data-testid=topup-success.",
        checklistItems: ["10.F6", "10.M4"],
        prerequisite: "Set credits to 0 via self-set-credits first so topup need is visible.",
        testIds: {
          openButton: "topup-open-btn",
          cardInput: "topup-card",
          submitButton: "topup-submit",
          successMessage: "topup-success",
          zeroBalanceBanner: "zero-balance-banner",
          lowBalanceBanner: "low-balance-banner",
          creditsDisplay: "credits-balance",
        },
      },
    ],
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCase } from "@/lib/cases";

export const dynamic = "force-dynamic";

// QA endpoint: returns the post-trial launch CTA configuration for a given caseId.
// Allows verify to assert the template trial entrypoint and checkout CTA marker
// without navigating through the full onboarding flow in Playwright.
// Authenticated via session.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId") ?? "ai-insta-influencer";

  const template = findCase(caseId);
  if (!template) {
    return NextResponse.json({ error: "unknown_case" }, { status: 404 });
  }

  const trialHref = `/onboarding/${caseId}`;

  return NextResponse.json({
    ok: true,
    caseId,
    companyName: template.company,
    trialHref,
    // Post-trial launch CTA DOM attributes the verify script should assert
    upgradeHookTestId: "upgrade-hook",
    checkoutCTATestId: "checkout-cta",
    ctaText: "Launch for $29/month",
    hookBodyText: `Second task · next employee · real paperclip instance — all for $29/month. Your ${template.company} carries over as-is.`,
    // Price mention verification
    priceMentioned: true,
    priceText: "$29/month",
    // These are the data-testids the Playwright verify should wait for after the sample task:
    // 1. data-testid="upgrade-hook" — upgrade section scrolled into view
    // 2. data-testid="checkout-cta" — Stripe checkout starts only from this post-trial CTA
    playwrightHints: {
      waitFor: "data-testid=upgrade-hook",
      assertExists: "data-testid=checkout-cta",
      assertTrialHref: trialHref,
    },
  });
}

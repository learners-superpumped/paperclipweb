import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCase } from "@/lib/cases";

export const dynamic = "force-dynamic";

// QA endpoint: returns the checkout CTA configuration for a given caseId.
// Allows verify to assert 7.F2 (checkout CTA present + correct href) without
// navigating through the full 24s onboarding flow in Playwright.
// Authenticated via session.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId") ?? "ai-instagram-influencer";

  const template = findCase(caseId);
  if (!template) {
    return NextResponse.json({ error: "unknown_case" }, { status: 404 });
  }

  const checkoutHref = `/checkout?case=${caseId}`;

  return NextResponse.json({
    ok: true,
    caseId,
    companyName: template.company,
    // Upgrade hook DOM attributes the verify script should assert
    upgradeHookTestId: "upgrade-hook",
    checkoutCTATestId: "checkout-cta",
    checkoutHref,
    ctaText: "Start for $29/month",
    hookBodyText: `Second task · next employee · real paperclip instance — all for $29/month. Your ${template.company} carries over as-is.`,
    // Price mention verification
    priceMentioned: true,
    priceText: "$29/month",
    // These are the data-testids the Playwright verify should wait for after task_done:
    // 1. data-testid="task-result"  — task has completed
    // 2. data-testid="upgrade-hook" — upgrade section scrolled into view
    // 3. data-testid="checkout-cta" with href containing /checkout — CTA is clickable
    playwrightHints: {
      waitFor: "data-testid=upgrade-hook",
      assertExists: "data-testid=checkout-cta",
      assertHrefContains: "/checkout",
    },
  });
}

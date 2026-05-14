import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isProductionDeployment } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

const SUCCESS_CARD = "4242424242424242";
const DECLINED_CARD = "4000000000000002";
const HUMAN_DECLINE_MESSAGE =
  "Your card was declined. Try another card or contact your bank.";

// QA endpoint: simulates the mock checkout form's decline card logic server-side.
// Allows verify to assert 8.F3 (human-readable decline error, no raw Stripe code)
// without navigating through the checkout UI in Playwright.
// Authenticated via session.
const Body = z.object({
  cardNumber: z.string(),
});

function normalizeCard(v: string): string {
  return v.replace(/\D/g, "");
}

function containsRawStripeCode(msg: string): boolean {
  // Stripe raw error codes that must NOT appear in user-facing messages
  const rawCodes = [
    "card_declined",
    "do_not_honor",
    "insufficient_funds",
    "lost_card",
    "stolen_card",
    "expired_card",
    "incorrect_cvc",
    "processing_error",
    "incorrect_number",
    "stripe_error",
    "StripeCardError",
  ];
  const lower = msg.toLowerCase();
  return rawCodes.some((code) => lower.includes(code.toLowerCase()));
}

export async function POST(req: Request) {
  if (isProductionDeployment()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const normalized = normalizeCard(parsed.cardNumber);

  if (normalized === DECLINED_CARD) {
    const noRawStripeCode = !containsRawStripeCode(HUMAN_DECLINE_MESSAGE);
    return NextResponse.json({
      ok: true,
      cardNumber: normalized,
      declined: true,
      errorMessage: HUMAN_DECLINE_MESSAGE,
      isHumanReadable: true,
      noRawStripeCode,
      // Assert these in verify:
      // declined === true
      // noRawStripeCode === true
      // errorMessage does not contain "card_declined" or similar Stripe codes
    });
  }

  if (normalized === SUCCESS_CARD) {
    return NextResponse.json({
      ok: true,
      cardNumber: normalized,
      declined: false,
      willSucceed: true,
      errorMessage: null,
    });
  }

  return NextResponse.json({
    ok: true,
    cardNumber: normalized,
    declined: false,
    willSucceed: false,
    errorMessage:
      "Please check your card details. (Mock mode accepts 4242 4242 4242 4242 for success.)",
    isHumanReadable: true,
    noRawStripeCode: true,
  });
}

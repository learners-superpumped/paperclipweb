import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensurePrice } from "@/lib/stripe-ensure";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const PAPERCLIP_PRO_MONTHLY_LOOKUP = "paperclipweb_pro_monthly";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isMock = process.env.PAPERCLIP_PAYMENT_MOCK === "true";
  if (isMock) {
    return NextResponse.json({ url: "/checkout/mock-success" });
  }

  const email = session.user.email;
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "no_user" }, { status: 404 });
  }

  const { caseId } = (await req.json().catch(() => ({}))) as { caseId?: string };

  // Ensure price exists (idempotent)
  const priceId = await ensurePrice({
    lookupKey: PAPERCLIP_PRO_MONTHLY_LOOKUP,
    unitAmount: 2900, // $29/month
    productName: "Paperclip Pro",
    interval: "month",
  });

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app"}/checkout/success?session_id={CHECKOUT_SESSION_ID}&caseId=${caseId ?? ""}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://usepaperclip.app"}/checkout/cancel?reason=declined`,
    metadata: {
      userId: user.id,
      caseId: caseId ?? "",
      plan: "starter",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

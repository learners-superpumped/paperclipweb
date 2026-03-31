import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { getUserById, updateUser } from "@/lib/queries";
import { getStripe, getPriceId, TOPUP_PRICE_IDS } from "@/lib/stripe";

const CheckoutSchema = z.object({
  plan: z.enum(["starter", "pro"]).optional(),
  topup: z.enum(["small", "medium", "large"]).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const dbUser = await getUserById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await updateUser(user.id, { stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Subscription checkout
    if (parsed.data.plan) {
      const priceId = getPriceId(parsed.data.plan);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/billing?success=true`,
        cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
        metadata: {
          userId: user.id,
          plan: parsed.data.plan,
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // Top-up checkout
    if (parsed.data.topup) {
      const pkg = TOPUP_PRICE_IDS[parsed.data.topup];
      if (!pkg) {
        return NextResponse.json({ error: "Invalid package" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Credit Top-up (${pkg.credits} credits)`,
              },
              unit_amount: pkg.price,
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/dashboard/billing?success=true&topup=${parsed.data.topup}`,
        cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
        metadata: {
          userId: user.id,
          type: "topup",
          topupPackage: parsed.data.topup,
          credits: String(pkg.credits),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Specify plan or topup" }, { status: 400 });
  } catch (error) {
    console.error("[Stripe] Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

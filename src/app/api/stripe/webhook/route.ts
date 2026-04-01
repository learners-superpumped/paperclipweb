import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, PLAN_CREDITS } from "@/lib/stripe";
import { db } from "@/db";
import { users, subscriptions, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addCreditTransaction, getUserById, createCompany } from "@/lib/queries";
import { notifySlack } from "@/lib/slack";
import {
  trackServerCheckoutCompleted,
  trackServerCreditsToppedUp,
  trackServerSubscriptionCanceled,
} from "@/lib/analytics-server";
import type Stripe from "stripe";

// Plan prices for server-side event properties
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 19,
  pro: 49,
};

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const topupPackage = session.metadata?.topupPackage;
        const topupCredits = session.metadata?.credits;
        const topupPrice = session.metadata?.price;

        if (!userId) break;

        if (plan && session.subscription) {
          // Subscription checkout completed
          const planCredits = PLAN_CREDITS[plan] ?? PLAN_CREDITS.free;
          const price = PLAN_PRICES[plan] ?? 0;

          // Create subscription record
          await db().insert(subscriptions).values({
            userId,
            stripeSubscriptionId: session.subscription as string,
            plan,
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });

          // Update user plan and credits
          await db()
            .update(users)
            .set({
              plan,
              creditsBalance: planCredits.balance,
              creditsLimit: planCredits.limit,
              stripeCustomerId: session.customer as string,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          // Credit transaction
          await addCreditTransaction({
            userId,
            amount: planCredits.balance,
            type: "subscription",
            description: `${plan} plan activated - ${planCredits.balance} credits`,
          });

          // Amplitude: checkout_completed
          await trackServerCheckoutCompleted(
            userId,
            plan,
            price,
            session.subscription as string
          );

          await notifySlack(
            `[paperclipweb] New ${plan} subscription! User: ${userId}, Amount: $${price}/mo`
          );

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
        } else if (topupPackage && topupCredits) {
          // Top-up purchase completed
          const credits = parseInt(topupCredits, 10);
          const price = topupPrice ? parseFloat(topupPrice) : 0;

          await addCreditTransaction({
            userId,
            amount: credits,
            type: "topup",
            description: `Top-up ${topupPackage}: +${credits} credits`,
          });

          // Amplitude: credits_topped_up
          await trackServerCreditsToppedUp(userId, topupPackage, credits, price);

          await notifySlack(
            `[paperclipweb] Credit top-up! User: ${userId}, Package: ${topupPackage}, Credits: ${credits}`
          );
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by Stripe customer ID
        const userResult = await db()
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);

        const user = userResult[0];
        if (!user) break;

        // Record invoice
        await db().insert(invoices).values({
          userId: user.id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          status: "paid",
        });

        // Renew credits on recurring payment (not first invoice)
        if (invoice.billing_reason === "subscription_cycle") {
          const planCredits = PLAN_CREDITS[user.plan] ?? PLAN_CREDITS.free;

          await db()
            .update(users)
            .set({
              creditsBalance: planCredits.balance,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

          await addCreditTransaction({
            userId: user.id,
            amount: planCredits.balance,
            type: "subscription",
            description: `Monthly credit renewal: +${planCredits.balance} credits`,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userResult = await db()
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);

        const user = userResult[0];
        if (!user) break;

        const previousPlan = user.plan;

        // Downgrade to free
        const freeCredits = PLAN_CREDITS.free;
        await db()
          .update(users)
          .set({
            plan: "free",
            creditsBalance: Math.min(user.creditsBalance, freeCredits.limit),
            creditsLimit: freeCredits.limit,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Update subscription record
        await db()
          .update(subscriptions)
          .set({ status: "canceled" })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

        // Amplitude: subscription_cancel
        await trackServerSubscriptionCanceled(user.id, previousPlan);

        await notifySlack(
          `[paperclipweb] Subscription canceled. User: ${user.id}, Previous plan: ${previousPlan}`
        );
        break;
      }
    }
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

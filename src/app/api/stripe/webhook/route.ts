import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, PLAN_CREDITS } from "@/lib/stripe";
import { db } from "@/db";
import { users, subscriptions, invoices, companies, stripeEvents, balances, balanceMovements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { addCreditTransaction, getUserById, createCompany } from "@/lib/queries";
import { notifySlack } from "@/lib/slack";
import {
  trackServerCheckoutCompleted,
  trackServerCreditsToppedUp,
  trackServerSubscriptionCanceled,
} from "@/lib/analytics-server";
import { sendSubscriptionCancelledEmail } from "@/lib/agentmail";
import { findCase } from "@/lib/cases";
import {
  isPaperclipConfigured,
  createPaperclipCompany,
  createCompanyInvite,
  registerGstackSkills,
  archivePaperclipCompany,
  syncCompanyBudget,
} from "@/lib/paperclip";
import type Stripe from "stripe";

function makeWebhookSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "company";
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

// Plan prices for server-side event properties. spec.md ## 6 pricing SoT: 단일 플랜 Pro $29/mo.
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  pro: 29,
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
    // Idempotency: skip already-processed events
    const alreadyProcessed = await db()
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1);
    if (alreadyProcessed[0]) {
      return NextResponse.json({ received: true, skipped: true });
    }
    await db().insert(stripeEvents).values({
      stripeEventId: event.id,
      type: event.type,
    }).onConflictDoNothing();

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

          // Auto-provision real paperclip instance from onboarding/case data
          const paidUser = await getUserById(userId);
          const sessionCaseId = session.metadata?.caseId ?? "";
          try {
            // Resolve company name from caseId template or onboardingData
            let companyName = "My AI Company";
            if (sessionCaseId) {
              const tmpl = findCase(sessionCaseId);
              if (tmpl?.company) companyName = tmpl.company;
            } else if (paidUser?.onboardingData) {
              const obData = JSON.parse(paidUser.onboardingData) as Record<string, unknown>;
              const raw = obData.companyName ?? obData.company ?? obData.idea ?? obData.name;
              if (raw) companyName = String(raw).slice(0, 50);
            }

            const slug = makeWebhookSlug(companyName);

            // Provision real paperclip company + invite
            let paperclipCompanyId: string | undefined;
            let instanceUrl: string | undefined;
            if (isPaperclipConfigured()) {
              const pcCompany = await createPaperclipCompany(
                companyName,
                `paperclipweb subscriber instance for ${paidUser?.email ?? userId}`,
              );
              if (pcCompany?.id) {
                paperclipCompanyId = pcCompany.id;
                const invite = await createCompanyInvite(pcCompany.id, "owner");
                if (invite?.url) instanceUrl = invite.url;
                await registerGstackSkills(pcCompany.id);
              }
            }

            await createCompany({
              userId,
              name: companyName,
              slug,
              caseId: sessionCaseId || undefined,
              paperclipCompanyId,
              instanceUrl,
              mockMode: false,
              status: paperclipCompanyId ? "running" : "provisioning",
            });
          } catch (err) {
            console.error("[Webhook] Failed to auto-provision:", err);
          }
        } else if (topupPackage && topupCredits) {
          // Top-up purchase completed
          const credits = parseInt(topupCredits, 10);
          const price = topupPrice ? parseFloat(topupPrice) : 0;
          const topupDollars = "4.5000"; // $4.50 LLM credit per topup

          await addCreditTransaction({
            userId,
            amount: credits,
            type: "topup",
            description: `Top-up ${topupPackage}: +${credits} credits`,
          });

          // Add dollar balance for LLM usage
          await db()
            .insert(balances)
            .values({ userId, dollars: topupDollars })
            .onConflictDoNothing();
          await db()
            .update(balances)
            .set({
              dollars: `(SELECT dollars + ${topupDollars} FROM paperclipweb.balances WHERE user_id = '${userId}')`,
              updatedAt: new Date(),
            })
            .where(eq(balances.userId, userId));
          await db().insert(balanceMovements).values({
            userId,
            kind: "topup",
            dollarsDelta: topupDollars,
            reference: session.id,
          });

          // Sync budget with paperclip engine (best-effort)
          try {
            const [companyRow] = await db()
              .select()
              .from(companies)
              .where(eq(companies.userId, userId))
              .limit(1);
            if (companyRow?.paperclipCompanyId) {
              const [bal] = await db().select().from(balances).where(eq(balances.userId, userId)).limit(1);
              if (bal) await syncCompanyBudget(companyRow.paperclipCompanyId, parseFloat(bal.dollars));
            }
          } catch {
            // Non-fatal
          }

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

        // Archive running and provisioning instances (30-day retention)
        const now = new Date();
        const deleteAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const companiesToArchive = await db()
          .select()
          .from(companies)
          .where(and(eq(companies.userId, user.id)));

        for (const company of companiesToArchive) {
          if (company.status === "running" || company.status === "provisioning") {
            await db()
              .update(companies)
              .set({ status: "archived", archivedAt: now, deleteAfter, updatedAt: now })
              .where(eq(companies.id, company.id));
            if (company.paperclipCompanyId) {
              await archivePaperclipCompany(company.paperclipCompanyId).catch(() => {});
            }
          }
        }

        // Send human-language cancellation email (best-effort)
        try {
          await sendSubscriptionCancelledEmail(user.email, user.name ?? undefined);
        } catch (err) {
          console.error("[Webhook] Failed to send cancellation email:", err);
        }

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

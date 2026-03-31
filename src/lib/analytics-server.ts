/**
 * Server-side Amplitude tracking via HTTP API v2.
 * Use this in Route Handlers / webhooks where the browser SDK is unavailable.
 *
 * Docs: https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/
 */

const SERVICE_NAME = "paperclipweb";

interface AmplitudeEvent {
  event_type: string;
  user_id?: string;
  device_id?: string;
  event_properties?: Record<string, unknown>;
  time?: number;
}

async function sendAmplitudeEvents(events: AmplitudeEvent[]): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn("[analytics-server] NEXT_PUBLIC_AMPLITUDE_API_KEY not set — skipping");
    return;
  }

  try {
    const res = await fetch("https://api2.amplitude.com/2/httpapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, events }),
    });
    if (!res.ok) {
      console.error("[analytics-server] Amplitude HTTP error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[analytics-server] Failed to send events:", err);
  }
}

function makeEvent(
  eventType: string,
  userId: string | undefined,
  properties: Record<string, unknown>
): AmplitudeEvent {
  return {
    event_type: eventType,
    // Amplitude requires either user_id or device_id
    user_id: userId ?? "server",
    device_id: userId ? undefined : "server-webhook",
    event_properties: {
      service: SERVICE_NAME,
      ...properties,
    },
    time: Date.now(),
  };
}

/** checkout.session.completed — subscription plan purchased */
export async function trackServerCheckoutCompleted(
  userId: string,
  plan: string,
  price: number,
  subscriptionId?: string
): Promise<void> {
  await sendAmplitudeEvents([
    makeEvent("checkout_completed", userId, { plan, price, subscription_id: subscriptionId }),
  ]);
}

/** checkout.session.completed — credit top-up purchased */
export async function trackServerCreditsToppedUp(
  userId: string,
  pkg: string,
  amount: number,
  price: number
): Promise<void> {
  await sendAmplitudeEvents([
    makeEvent("credits_topped_up", userId, { package: pkg, amount, price }),
  ]);
}

/** customer.subscription.deleted — subscription canceled */
export async function trackServerSubscriptionCanceled(
  userId: string,
  previousPlan: string
): Promise<void> {
  await sendAmplitudeEvents([
    makeEvent("subscription_cancel", userId, { previous_plan: previousPlan }),
  ]);
}

/** credits consumed via AI proxy */
export async function trackServerCreditsUsed(
  userId: string,
  amount: number,
  actionType: string,
  instanceId?: string
): Promise<void> {
  await sendAmplitudeEvents([
    makeEvent("credits_used", userId, {
      amount,
      action_type: actionType,
      instance_id: instanceId,
    }),
  ]);
}

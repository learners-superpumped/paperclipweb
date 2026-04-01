"use client";

import * as amplitude from "@amplitude/analytics-browser";

const SERVICE_NAME = "paperclipweb";

let initialized = false;

export const initAmplitude = () => {
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY &&
    !initialized
  ) {
    amplitude.init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY, {
      defaultTracking: {
        sessions: true,
        pageViews: false,
        formInteractions: false,
        fileDownloads: false,
      },
    });
    initialized = true;
  }
};

export const trackEvent = (
  name: string,
  properties?: Record<string, unknown>
) => {
  amplitude.track(name, { service: SERVICE_NAME, ...properties });
};

// --- Page tracking ---

export const trackPageView = (pageName: string, properties?: Record<string, unknown>) => {
  trackEvent("page_view", {
    page: pageName,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    ...properties,
  });
};

// --- Session (DAU/MAU) ---

/** Fire once per app load. returning=true when user has visited before. */
export const trackSessionStart = (returning: boolean) =>
  trackEvent("session_start", { returning });

// --- Onboarding funnel ---

/** Hero or nav CTA click before signup */
export const trackCTAClick = (ctaName: string, page: string) =>
  trackEvent("cta_click", { cta_name: ctaName, page });

/** User lands on signup page and begins the form flow */
export const trackSignupStarted = (method: "email" | "github" | "google") =>
  trackEvent("signup_started", { method });

/** User successfully submits signup (after async call succeeds) */
export const trackSignupCompleted = (method: "email" | "github" | "google") =>
  trackEvent("signup_completed", { method });

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

// --- Instance lifecycle ---

/** Every instance creation */
export const trackInstanceCreated = (instanceName: string, isFirst: boolean) =>
  trackEvent("instance_created", { instance_name: instanceName, is_first: isFirst });

/** First instance ever created by the user (triggers first_use funnel step) */
export const trackFirstInstanceCreated = (instanceName: string) =>
  trackEvent("first_instance_created", { instance_name: instanceName });

/** Instance deleted */
export const trackInstanceDeleted = (instanceId: string) =>
  trackEvent("instance_deleted", { instance_id: instanceId });

// --- Credits ---

/** Credits consumed via AI proxy (server-side) */
export const trackCreditsUsed = (
  amount: number,
  actionType: string,
  instanceId?: string
) => trackEvent("credits_used", { amount, action_type: actionType, instance_id: instanceId });

/** Credits topped up via Stripe (server-side) */
export const trackCreditsToppedUp = (
  pkg: string,
  amount: number,
  price: number,
  userId?: string
) => trackEvent("credits_topped_up", { package: pkg, amount, price, user_id: userId });

// --- Billing / checkout ---

/** Pricing section viewed */
export const trackPricingView = (source: string) =>
  trackEvent("pricing_view", { source });

/** Billing dashboard viewed */
export const trackBillingViewed = () =>
  trackEvent("billing_viewed", {});

/** Stripe checkout session initiated */
export const trackCheckoutStarted = (
  plan: string,
  price?: number,
  action?: "subscription" | "topup"
) => trackEvent("checkout_started", { plan, price, action: action ?? "subscription" });

/** Stripe checkout.session.completed (server-side) */
export const trackCheckoutCompleted = (
  plan: string,
  price: number,
  subscriptionId?: string,
  userId?: string
) =>
  trackEvent("checkout_completed", {
    plan,
    price,
    subscription_id: subscriptionId,
    user_id: userId,
  });

/** Subscription canceled (server-side) */
export const trackSubscriptionCanceled = (
  previousPlan: string,
  userId?: string
) => trackEvent("subscription_cancel", { previous_plan: previousPlan, user_id: userId });

// --- Retention signals ---

/** Dashboard home viewed */
export const trackDashboardViewed = () =>
  trackEvent("dashboard_viewed", {});

/** Settings field saved */
export const trackSettingsUpdated = (field: string) =>
  trackEvent("settings_updated", { field });

// --- Identity ---

export const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
  amplitude.setUserId(userId);
  if (traits) {
    const identifyEvent = new amplitude.Identify();
    Object.entries(traits).forEach(([key, value]) => {
      identifyEvent.set(key, value as string);
    });
    amplitude.identify(identifyEvent);
  }
};

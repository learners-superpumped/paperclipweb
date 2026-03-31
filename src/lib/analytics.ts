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

export const trackPageView = (pageName: string, properties?: Record<string, unknown>) => {
  trackEvent("page_view", { page: pageName, ...properties });
};

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

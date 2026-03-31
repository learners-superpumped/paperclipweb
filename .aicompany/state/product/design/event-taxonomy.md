# paperclipweb — Amplitude Event Taxonomy

**Version:** 1.0
**Date:** 2026-03-31
**Service tag:** `paperclipweb` (present on every event)

---

## Common Properties

Every event carries these base properties automatically:

| Property | Type | Description |
|----------|------|-------------|
| `service` | string | Always `"paperclipweb"` — for cross-project Amplitude filtering |
| `user_id` | string | Set via `amplitude.setUserId()` after authentication |

---

## Onboarding Funnel

Amplitude funnel chart:
`page_view` → `cta_click` → `signup_started` → `signup_completed` → `first_instance_created` → `checkout_started` → `checkout_completed`

| # | Event | Trigger | Properties | Source |
|---|-------|---------|------------|--------|
| 1 | `page_view` | Every route change | `page` (pathname), `referrer` | `AnalyticsProvider` (auto) |
| 2 | `cta_click` | Hero "무료로 시작하기" or pricing plan button clicked | `cta_name`, `page` | `hero.tsx`, `pricing.tsx` |
| 3 | `signup_started` | Signup page mounted; social button clicked | `method` ("email" / "github" / "google") | `signup/page.tsx` |
| 4 | `signup_completed` | Magic link sent successfully; social OAuth redirect | `method` | `signup/page.tsx` |
| 5 | `first_instance_created` | User creates their very first Paperclip instance | `instance_name` | `instances/page.tsx` |
| 6 | `checkout_started` | Stripe Checkout session initiated | `plan`, `price`, `action` ("subscription" / "topup") | `billing/page.tsx` |
| 7 | `checkout_completed` | `checkout.session.completed` Stripe webhook | `plan`, `price`, `subscription_id`, `user_id` | `api/stripe/webhook` (server) |

---

## Session / DAU / MAU

| Event | Trigger | Properties | Notes |
|-------|---------|------------|-------|
| `session_start` | App first mounts (once per browser session) | `returning` (bool) | **DAU = daily unique users on this event. MAU = monthly unique users.** |

- `returning: false` — first ever visit (no `pweb_visited` cookie)
- `returning: true` — repeat visitor

---

## Instance Lifecycle

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `instance_created` | Any instance created | `instance_name`, `is_first` (bool) | `instances/page.tsx` |
| `first_instance_created` | First instance ever for this user | `instance_name` | `instances/page.tsx` |
| `instance_deleted` | Instance deleted | `instance_id` | `instances/page.tsx` |

---

## Credits

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `credits_used` | AI proxy call (per request) | `amount`, `action_type`, `instance_id` | `api/proxy/ai` (server) |
| `credits_topped_up` | Top-up purchase completed | `package`, `amount`, `price` | `api/stripe/webhook` (server) |

---

## Billing / Subscription

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `pricing_view` | Pricing section visible | `source` (e.g. "hero_cta", "billing_page") | `hero.tsx`, `billing/page.tsx` |
| `billing_viewed` | Billing dashboard mounted | — | `billing/page.tsx` |
| `checkout_started` | Stripe Checkout session initiated | `plan`, `price`, `action` | `billing/page.tsx` |
| `checkout_completed` | Stripe webhook confirmed payment | `plan`, `price`, `subscription_id`, `user_id` | Webhook (server) |
| `subscription_cancel` | `customer.subscription.deleted` webhook | `previous_plan`, `user_id` | Webhook (server) |

---

## Authentication

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `signup_started` | Signup page load / social button click | `method` | `signup/page.tsx` |
| `signup_completed` | Magic link sent / OAuth redirect | `method` | `signup/page.tsx` |
| `login` | Login form submit / social login | `method` | `login/page.tsx` |

---

## Retention Signals

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `dashboard_viewed` | Dashboard home mounted | — | `dashboard/page.tsx` |
| `billing_viewed` | Billing page mounted | — | `billing/page.tsx` |
| `settings_updated` | Profile save succeeds | `field` (e.g. "name") | `settings/page.tsx` |

---

## Miscellaneous

| Event | Trigger | Properties | Source |
|-------|---------|------------|--------|
| `feature_used` | Misc feature interactions (copy API key, delete account) | `feature` | Various |

---

## Implementation Notes

### Client-side
- **`src/lib/analytics.ts`** — all typed helper functions
- **`src/components/analytics-provider.tsx`** — auto `session_start` + `page_view` on pathname change; user identity

### Server-side
- **`src/lib/analytics-server.ts`** — Amplitude HTTP API v2 calls for webhook events
- **`src/app/api/stripe/webhook/route.ts`** — fires `checkout_completed`, `credits_topped_up`, `subscription_cancel`

### Key Amplitude Charts to Build

1. **Onboarding Funnel** — `page_view → cta_click → signup_started → signup_completed → first_instance_created → checkout_started → checkout_completed`
2. **DAU/MAU** — `session_start` event, unique users by day / month
3. **Conversion Rate** — `signup_completed` unique users ÷ `page_view` unique users
4. **Paid Conversion** — `checkout_completed` ÷ `signup_completed`
5. **Churn** — `subscription_cancel` events over time
6. **Credit Burn** — `credits_used.amount` sum by day

---

## Hypothesis Tracking

| Hypothesis | Key Metric | Events |
|------------|-----------|--------|
| VH1: BYOK vs bundle preference | signup rate | `signup_completed` count |
| VH2: Premium willingness | paid conversion | `checkout_completed` / `signup_completed` |
| GH1: Community organic traffic | unique visitors | `page_view` unique users, `session_start` |
| GH2: Viral sharing | share rate | (future `share` event) |

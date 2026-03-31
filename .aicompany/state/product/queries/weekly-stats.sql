-- paperclipweb Weekly Stats
-- Run against Neon PostgreSQL (paperclipweb schema)
-- Execute every Monday at 09:00 KST

-- Weekly new signups (last 7 days vs prior 7 days)
SELECT
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')  AS signups_this_week,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
                    AND  created_at <  CURRENT_DATE - INTERVAL '7 days')  AS signups_last_week,
  ROUND(
    (COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') -
     COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
                       AND  created_at <  CURRENT_DATE - INTERVAL '7 days'))
    * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
                              AND  created_at <  CURRENT_DATE - INTERVAL '7 days'), 0),
  1) AS wow_growth_pct
FROM paperclipweb.users;

-- Weekly active users (WAU) — users who consumed credits in the last 7 days
SELECT COUNT(DISTINCT user_id) AS wau
FROM paperclipweb.credit_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND type = 'usage';

-- Conversion funnel this week
WITH cohort AS (
  SELECT id AS user_id, created_at
  FROM paperclipweb.users
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  COUNT(*)                                             AS signups,
  COUNT(c.id)                                          AS created_instance,
  COUNT(s.id) FILTER (WHERE s.plan != 'free')          AS paid_conversions,
  ROUND(COUNT(c.id) * 100.0 / NULLIF(COUNT(*), 0), 1) AS signup_to_instance_pct,
  ROUND(COUNT(s.id) FILTER (WHERE s.plan != 'free') * 100.0 / NULLIF(COUNT(*), 0), 1) AS signup_to_paid_pct
FROM cohort u
LEFT JOIN paperclipweb.companies c ON c.user_id = u.user_id
  AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
LEFT JOIN paperclipweb.subscriptions s ON s.user_id = u.user_id
  AND s.status = 'active'
  AND s.plan != 'free';

-- Churn this week: subscriptions canceled in last 7 days
SELECT COUNT(*) AS canceled_subscriptions_this_week
FROM paperclipweb.subscriptions
WHERE status = 'canceled'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Weekly revenue from invoices
SELECT
  COALESCE(SUM(amount) / 100.0, 0) AS revenue_usd_this_week,
  COUNT(*)                          AS paid_invoices
FROM paperclipweb.invoices
WHERE status = 'paid'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Credit usage by model this week
SELECT
  COALESCE(model, 'unknown')    AS model,
  COALESCE(provider, 'unknown') AS provider,
  SUM(ABS(amount))              AS credits_consumed,
  COUNT(DISTINCT user_id)       AS unique_users,
  COALESCE(SUM(tokens_input), 0)  AS total_tokens_in,
  COALESCE(SUM(tokens_output), 0) AS total_tokens_out
FROM paperclipweb.credit_transactions
WHERE type = 'usage'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY model, provider
ORDER BY credits_consumed DESC;

-- MRR as of now
SELECT
  SUM(CASE WHEN plan = 'starter' THEN 19
           WHEN plan = 'pro'     THEN 49
           ELSE 0 END)        AS mrr_usd,
  COUNT(*) FILTER (WHERE plan IN ('starter','pro')) AS paid_users,
  COUNT(*)                                          AS total_users
FROM paperclipweb.users;

-- Kill criteria check
SELECT
  (SELECT COUNT(*) FROM paperclipweb.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS signups_7d,
  (SELECT COUNT(*) FROM paperclipweb.users WHERE plan IN ('starter','pro'))                       AS paid_users_total,
  (SELECT COALESCE(SUM(CASE WHEN plan='starter' THEN 19 WHEN plan='pro' THEN 49 ELSE 0 END), 0)
   FROM paperclipweb.users)                                                                        AS mrr_usd,
  -- Kill signals (TRUE = kill criteria met)
  (SELECT COUNT(*) FROM paperclipweb.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') < 5 AS kill_1w_signups,
  (SELECT COUNT(*) FROM paperclipweb.users WHERE plan IN ('starter','pro')) < 3
    AND
  (SELECT COALESCE(SUM(CASE WHEN plan='starter' THEN 19 WHEN plan='pro' THEN 49 ELSE 0 END), 0)
   FROM paperclipweb.users) < 57                                                                   AS kill_1m;

-- paperclipweb Daily Stats
-- Run against Neon PostgreSQL (paperclipweb schema)
-- Execute daily at 09:00 KST

-- Total users (all time)
SELECT COUNT(*) AS total_users
FROM paperclipweb.users;

-- New signups today
SELECT COUNT(*) AS new_signups_today
FROM paperclipweb.users
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';

-- Active users today (users who have a session active today via credit usage)
SELECT COUNT(DISTINCT user_id) AS active_users_today
FROM paperclipweb.credit_transactions
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day'
  AND type = 'usage';

-- Paid users (active subscriptions, non-free)
SELECT COUNT(*) AS paid_users
FROM paperclipweb.users
WHERE plan IN ('starter', 'pro');

-- MRR estimate (based on active paid users)
SELECT
  SUM(
    CASE
      WHEN plan = 'starter' THEN 19
      WHEN plan = 'pro'     THEN 49
      ELSE 0
    END
  ) AS mrr_usd
FROM paperclipweb.users
WHERE plan IN ('starter', 'pro');

-- Plan breakdown
SELECT
  plan,
  COUNT(*) AS user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM paperclipweb.users
GROUP BY plan
ORDER BY user_count DESC;

-- Credits consumed today
SELECT
  COALESCE(SUM(ABS(amount)), 0) AS credits_consumed_today,
  COUNT(DISTINCT user_id)        AS users_who_consumed
FROM paperclipweb.credit_transactions
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day'
  AND type = 'usage';

-- Companies (instances) created today
SELECT COUNT(*) AS instances_created_today
FROM paperclipweb.companies
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';

-- Companies by status
SELECT status, COUNT(*) AS count
FROM paperclipweb.companies
GROUP BY status
ORDER BY count DESC;

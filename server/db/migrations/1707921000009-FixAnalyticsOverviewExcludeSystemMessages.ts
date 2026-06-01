export async function up(sql: any) {
  await sql`
    CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_date_range text DEFAULT 'month'::text)
     RETURNS json
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    DECLARE
      v_interval interval := _analytics_interval(p_date_range);
      v_cutoff   timestamptz := now() - v_interval;
      v_prev_cutoff timestamptz := now() - (v_interval * 2);
      v_result   json;
    BEGIN
      WITH
      users AS (
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status = 'active') AS active,
          count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new_7d,
          count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_30d
        FROM user_profiles
      ),
      growth AS (
        SELECT
          count(*) FILTER (WHERE created_at >= v_cutoff) AS current_period,
          count(*) FILTER (WHERE created_at >= v_prev_cutoff AND created_at < v_cutoff) AS previous_period
        FROM user_profiles
      ),
      reports AS (
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status = 'pending') AS pending,
          count(*) FILTER (WHERE status IN ('resolved', 'action_taken')) AS resolved
        FROM user_reports
      ),
      activities AS (
        SELECT
          count(*) FILTER (WHERE type = 'blend') AS blends,
          count(*) AS total
        FROM activities
      ),
      friends AS (
        SELECT count(*) AS total FROM friends
      ),
      messages AS (
        SELECT count(*) AS total FROM messages WHERE created_at >= v_cutoff AND system_user_id IS NULL
      )
      SELECT json_build_object(
        'total_users',          (SELECT total FROM users),
        'active_users',         (SELECT active FROM users),
        'new_users_7d',         (SELECT new_7d FROM users),
        'new_users_30d',        (SELECT new_30d FROM users),
        'growth_rate',          CASE
                                  WHEN (SELECT previous_period FROM growth) = 0 THEN 0
                                  ELSE round(100.0 * ((SELECT current_period FROM growth) - (SELECT previous_period FROM growth))
                                       / (SELECT previous_period FROM growth), 1)
                                END,
        'total_revenue',        0,
        'total_subscriptions',  0,
        'churn_rate',           0,
        'total_reports',        (SELECT total FROM reports),
        'reports_opened',       (SELECT pending FROM reports),
        'reports_resolved',     (SELECT resolved FROM reports),
        'meetups_created',      0,
        'events_created',       0,
        'blends_created',       (SELECT blends FROM activities),
        'total_activities',     (SELECT total FROM activities),
        'total_friends',        (SELECT total FROM friends),
        'messages_period',      (SELECT total FROM messages)
      ) INTO v_result;

      RETURN v_result;
    END;
    $function$
  `;
}

export async function down(sql: any) {
  await sql`
    CREATE OR REPLACE FUNCTION public.get_analytics_overview(p_date_range text DEFAULT 'month'::text)
     RETURNS json
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    DECLARE
      v_interval interval := _analytics_interval(p_date_range);
      v_cutoff   timestamptz := now() - v_interval;
      v_prev_cutoff timestamptz := now() - (v_interval * 2);
      v_result   json;
    BEGIN
      WITH
      users AS (
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status = 'active') AS active,
          count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new_7d,
          count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_30d
        FROM user_profiles
      ),
      growth AS (
        SELECT
          count(*) FILTER (WHERE created_at >= v_cutoff) AS current_period,
          count(*) FILTER (WHERE created_at >= v_prev_cutoff AND created_at < v_cutoff) AS previous_period
        FROM user_profiles
      ),
      reports AS (
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status = 'pending') AS pending,
          count(*) FILTER (WHERE status IN ('resolved', 'action_taken')) AS resolved
        FROM user_reports
      ),
      activities AS (
        SELECT
          count(*) FILTER (WHERE type = 'blend') AS blends,
          count(*) AS total
        FROM activities
      ),
      friends AS (
        SELECT count(*) AS total FROM friends
      ),
      messages AS (
        SELECT count(*) AS total FROM messages WHERE created_at >= v_cutoff
      )
      SELECT json_build_object(
        'total_users',          (SELECT total FROM users),
        'active_users',         (SELECT active FROM users),
        'new_users_7d',         (SELECT new_7d FROM users),
        'new_users_30d',        (SELECT new_30d FROM users),
        'growth_rate',          CASE
                                  WHEN (SELECT previous_period FROM growth) = 0 THEN 0
                                  ELSE round(100.0 * ((SELECT current_period FROM growth) - (SELECT previous_period FROM growth))
                                       / (SELECT previous_period FROM growth), 1)
                                END,
        'total_revenue',        0,
        'total_subscriptions',  0,
        'churn_rate',           0,
        'total_reports',        (SELECT total FROM reports),
        'reports_opened',       (SELECT pending FROM reports),
        'reports_resolved',     (SELECT resolved FROM reports),
        'meetups_created',      0,
        'events_created',       0,
        'blends_created',       (SELECT blends FROM activities),
        'total_activities',     (SELECT total FROM activities),
        'total_friends',        (SELECT total FROM friends),
        'messages_period',      (SELECT total FROM messages)
      ) INTO v_result;

      RETURN v_result;
    END;
    $function$
  `;
}

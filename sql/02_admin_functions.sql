-- ============================================================================
-- MEETRO ADMIN ANALYTICS FUNCTIONS
-- ============================================================================

-- Helper: convert date_range text to interval
CREATE OR REPLACE FUNCTION _analytics_interval(p_date_range text)
RETURNS interval LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_date_range
    WHEN 'today'   THEN interval '1 day'
    WHEN 'week'    THEN interval '7 days'
    WHEN 'month'   THEN interval '30 days'
    WHEN 'quarter' THEN interval '90 days'
    WHEN 'year'    THEN interval '365 days'
    ELSE interval '30 days'
  END;
$$;


-- ============================================================================
-- GET_USER_ANALYTICS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_analytics(p_date_range text DEFAULT 'month')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_interval interval := _analytics_interval(p_date_range);
  v_cutoff   timestamptz := now() - v_interval;
  v_prev_cutoff timestamptz := now() - (v_interval * 2);
  v_result   json;
BEGIN
  WITH
  current_period AS (
    SELECT count(*) AS new_users
    FROM user_profiles
    WHERE created_at >= v_cutoff
  ),
  previous_period AS (
    SELECT count(*) AS new_users
    FROM user_profiles
    WHERE created_at >= v_prev_cutoff AND created_at < v_cutoff
  ),
  totals AS (
    SELECT
      count(*) AS total_users,
      count(*) FILTER (WHERE status = 'active') AS active_users,
      count(*) FILTER (WHERE last_active_at >= now() - interval '7 days') AS active_7d,
      count(*) FILTER (WHERE created_at >= now() - interval '1 day') AS new_today,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new_week,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new_month
    FROM user_profiles
  ),
  retention AS (
    SELECT
      CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE last_active_at >= now() - interval '7 days') / count(*), 1)
      END AS retention_rate
    FROM user_profiles
    WHERE created_at < now() - interval '7 days'
  ),
  by_role AS (
    SELECT role, count(*) AS cnt
    FROM user_profiles
    GROUP BY role
  ),
  by_status AS (
    SELECT status, count(*) AS cnt
    FROM user_profiles
    GROUP BY status
  ),
  daily_growth AS (
    SELECT
      d::date AS day,
      count(up.user_id) AS signups
    FROM generate_series(v_cutoff::date, now()::date, '1 day') d
    LEFT JOIN user_profiles up ON up.created_at::date = d::date
    GROUP BY d::date
    ORDER BY d::date
  ),
  -- Average time from signup to first activity joined (via participants)
  avg_time_to_join AS (
    SELECT round(avg(EXTRACT(EPOCH FROM (first_join - signup)) / 3600)::numeric, 1) AS avg_hours
    FROM (
      SELECT up.user_id, up.created_at AS signup, min(p.joined_at) AS first_join
      FROM user_profiles up
      JOIN participants p ON p.user_id = up.user_id
      JOIN chats c ON c.id = p.chat_id AND c.activity_id IS NOT NULL
      GROUP BY up.user_id, up.created_at
    ) sub
  ),
  -- Average time from signup to first activity created
  avg_time_to_create AS (
    SELECT round(avg(EXTRACT(EPOCH FROM (first_created - signup)) / 3600)::numeric, 1) AS avg_hours
    FROM (
      SELECT up.user_id, up.created_at AS signup, min(a.created_at) AS first_created
      FROM user_profiles up
      JOIN activities a ON a.created_by = up.user_id
      GROUP BY up.user_id, up.created_at
    ) sub
  )
  SELECT json_build_object(
    'new_users_today',      (SELECT new_today FROM totals),
    'new_users_this_week',  (SELECT new_week FROM totals),
    'new_users_this_month', (SELECT new_month FROM totals),
    'total_users',          (SELECT total_users FROM totals),
    'active_users',         (SELECT active_users FROM totals),
    'active_7d',            (SELECT active_7d FROM totals),
    'user_retention_rate',  (SELECT retention_rate FROM retention),
    'growth_rate',          CASE
                              WHEN (SELECT new_users FROM previous_period) = 0 THEN 0
                              ELSE round(100.0 * ((SELECT new_users FROM current_period) - (SELECT new_users FROM previous_period))
                                   / (SELECT new_users FROM previous_period), 1)
                            END,
    'avg_hours_to_first_join',   COALESCE((SELECT avg_hours FROM avg_time_to_join), 0),
    'avg_hours_to_first_create', COALESCE((SELECT avg_hours FROM avg_time_to_create), 0),
    'by_role',              (SELECT json_agg(json_build_object('role', role, 'count', cnt)) FROM by_role),
    'by_status',            (SELECT json_agg(json_build_object('status', status, 'count', cnt)) FROM by_status),
    'user_growth_data',     (SELECT json_agg(json_build_object('label', to_char(day, 'Mon DD'), 'value', signups) ORDER BY day) FROM daily_growth)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- GET_CONTENT_ANALYTICS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_content_analytics(p_date_range text DEFAULT 'month')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_interval interval := _analytics_interval(p_date_range);
  v_cutoff   timestamptz := now() - v_interval;
  v_result   json;
BEGIN
  WITH
  activity_counts AS (
    SELECT
      count(*) AS total_activities,
      count(*) FILTER (WHERE type = 'meetup')  AS total_meetups,
      count(*) FILTER (WHERE type = 'event')   AS total_events,
      count(*) FILTER (WHERE type = 'blend')   AS total_blends,
      count(*) FILTER (WHERE created_at >= v_cutoff) AS new_activities
    FROM activities
  ),
  chat_counts AS (
    SELECT
      count(*) AS total_chats,
      count(*) FILTER (WHERE created_at >= v_cutoff) AS new_chats
    FROM chats
  ),
  message_counts AS (
    SELECT
      count(*) AS total_messages,
      count(*) FILTER (WHERE created_at >= v_cutoff) AS new_messages
    FROM messages
  ),
  participant_counts AS (
    SELECT count(DISTINCT user_id) AS total_participants
    FROM participants
    WHERE joined_at >= v_cutoff
  ),
  engagement AS (
    SELECT
      CASE WHEN (SELECT count(*) FROM user_profiles) = 0 THEN 0
        ELSE round(100.0 * (SELECT total_participants FROM participant_counts) / (SELECT count(*) FROM user_profiles), 1)
      END AS engagement_rate
  ),
  daily_activities AS (
    SELECT
      d::date AS day,
      count(a.id) FILTER (WHERE a.type = 'meetup') AS meetups,
      count(a.id) FILTER (WHERE a.type = 'event')  AS events,
      count(a.id) FILTER (WHERE a.type = 'blend')  AS blends
    FROM generate_series(v_cutoff::date, now()::date, '1 day') d
    LEFT JOIN activities a ON a.created_at::date = d::date
    GROUP BY d::date
    ORDER BY d::date
  ),
  top_activities AS (
    SELECT a.id, a.title, a.type, count(p.id) AS participant_count
    FROM activities a
    LEFT JOIN chats c ON c.activity_id = a.id
    LEFT JOIN participants p ON p.chat_id = c.id
    WHERE a.created_at >= v_cutoff
    GROUP BY a.id, a.title, a.type
    ORDER BY participant_count DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'total_meetups',            (SELECT total_meetups FROM activity_counts),
    'total_events',             (SELECT total_events FROM activity_counts),
    'total_blends',             (SELECT total_blends FROM activity_counts),
    'total_chats',              (SELECT total_chats FROM chat_counts),
    'total_messages',           (SELECT total_messages FROM message_counts),
    'new_messages_period',      (SELECT new_messages FROM message_counts),
    'new_activities_period',    (SELECT new_activities FROM activity_counts),
    'active_participants',      (SELECT total_participants FROM participant_counts),
    'content_engagement_rate',  (SELECT engagement_rate FROM engagement),
    'daily_activity_data',      (SELECT json_agg(json_build_object(
                                  'label', to_char(day, 'Mon DD'),
                                  'meetups', meetups,
                                  'events', events,
                                  'blends', blends
                                ) ORDER BY day) FROM daily_activities),
    'top_activities',           (SELECT json_agg(json_build_object(
                                  'title', title, 'type', type, 'participants', participant_count
                                )) FROM top_activities)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- GET_REVENUE_ANALYTICS (placeholder — no subscription tables yet)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_revenue_analytics(p_date_range text DEFAULT 'month')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- No subscription/payment tables exist yet.
  -- Returns zeros so the frontend renders without errors.
  RETURN json_build_object(
    'daily_revenue',        0,
    'weekly_revenue',       0,
    'monthly_revenue',      0,
    'revenue_growth_rate',  0,
    'total_subscriptions',  0,
    'active_subscriptions', 0,
    'revenue_chart_data',   '[]'::json
  );
END;
$$;


-- ============================================================================
-- GET_ANALYTICS_OVERVIEW (aggregates all sections into one call)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_analytics_overview(p_date_range text DEFAULT 'month')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      count(*) FILTER (WHERE type = 'meetup') AS meetups,
      count(*) FILTER (WHERE type = 'event') AS events,
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
    'meetups_created',      (SELECT meetups FROM activities),
    'events_created',       (SELECT events FROM activities),
    'total_activities',     (SELECT total FROM activities),
    'total_friends',        (SELECT total FROM friends),
    'messages_period',      (SELECT total FROM messages)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

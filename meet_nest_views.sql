-- =============== ANALYTICS VIEWS ===============

-- User Analytics Overview
CREATE OR REPLACE VIEW view_user_analytics_overview AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
    ROUND(
        (
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::numeric /
            NULLIF(
                COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days' 
                           AND created_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END), 
                0
            ) - 1
        ) * 100, 
        2
    ) as growth_rate
FROM user_profiles;


-- User Growth Data (for charts)
CREATE OR REPLACE VIEW user_growth_chart_data AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') as label,
    COUNT(*) as value
FROM user_profiles 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- Revenue Analytics Overview
CREATE OR REPLACE VIEW view_revenue_analytics_overview AS
SELECT 
    COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END), 0)::float / 100 as total_revenue,
    COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE THEN p.amount_cents END), 0)::float / 100 as daily_revenue,
    COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN p.amount_cents END), 0)::float / 100 as weekly_revenue,
    COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0)::float / 100 as monthly_revenue,
    COUNT(DISTINCT s.id) as total_subscriptions,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
    ROUND(
        (
            COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0)::numeric /
            NULLIF(COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '60 days' AND p.created_at < CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0), 0)
        - 1) * 100, 
        2
    ) as revenue_growth_rate,
    ROUND(
        (
            COUNT(CASE WHEN s.status = 'canceled' AND s.end_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::numeric /
            NULLIF(COUNT(CASE WHEN s.status IN ('active', 'canceled') THEN 1 END), 0)
        ) * 100, 
        2
    ) as churn_rate
FROM subscriptions s
LEFT JOIN payments p ON p.subscription_id = s.id;


-- Revenue Chart Data



-- Content Analytics Overview
CREATE OR REPLACE VIEW view.content_analytics_overview AS
SELECT 
    (SELECT COUNT(*) FROM meetups) as total_meetups,
    (SELECT COUNT(*) FROM events) as total_events,
    (SELECT COUNT(*) FROM messages) as total_chats,
    (SELECT COUNT(*) FROM chats WHERE chat_type = 'trip') as total_trip_chats,
    (SELECT COUNT(*) FROM user_reports) as total_reports,
    (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') as pending_reports,
    ROUND(
        (
            (SELECT COUNT(*) FROM meetups WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::numeric + 
            (SELECT COUNT(*) FROM events WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::numeric + 
            (SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::numeric
        ) / NULLIF(
            (SELECT COUNT(*) FROM meetups)::numeric + 
            (SELECT COUNT(*) FROM events)::numeric + 
            (SELECT COUNT(*) FROM messages)::numeric, 
            0
        ) * 100, 
        2
    ) as content_engagement_rate;


-- User Retention Analytics
-- User Retention Analytics
CREATE OR REPLACE VIEW view_user_retention_analytics AS
WITH user_cohorts AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', created_at) as cohort_month,
        created_at
    FROM user_profiles
),
user_activities AS (
    SELECT DISTINCT
        user_id,
        DATE_TRUNC('month', created_at) as activity_month
    FROM (
        SELECT created_by as user_id, created_at FROM meetups WHERE created_by IS NOT NULL
        UNION ALL
        SELECT created_by as user_id, created_at FROM events WHERE created_by IS NOT NULL
        UNION ALL
        SELECT user_id, created_at FROM messages WHERE user_id IS NOT NULL
    ) activities
)
SELECT 
    uc.cohort_month,
    COUNT(DISTINCT uc.user_id) as cohort_size,
    COUNT(DISTINCT CASE WHEN ua.activity_month = uc.cohort_month + INTERVAL '1 month' THEN uc.user_id END) as month_1_retained,
    ROUND(
        (
            COUNT(DISTINCT CASE WHEN ua.activity_month = uc.cohort_month + INTERVAL '1 month' THEN uc.user_id END)::numeric /
            NULLIF(COUNT(DISTINCT uc.user_id), 0)
        ) * 100, 
        2
    ) as retention_rate
FROM user_cohorts uc
LEFT JOIN user_activities ua ON uc.user_id = ua.user_id
WHERE uc.cohort_month >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY uc.cohort_month
ORDER BY uc.cohort_month;


-- Geographic Analytics
CREATE OR REPLACE VIEW geographic_analytics AS
SELECT 
    current_country,
    current_city,
    COUNT(*) as user_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month
FROM user_profiles 
WHERE current_country IS NOT NULL
GROUP BY current_country, current_city
ORDER BY user_count DESC
LIMIT 50;

-- Popular Interests Analytics
CREATE OR REPLACE VIEW popular_interests_analytics AS
SELECT 
    i.name,
    i.emoticon,
    COUNT(ui.user_id) as user_count,
    ROUND(
        (COUNT(ui.user_id)::numeric / (SELECT COUNT(*) FROM user_profiles) * 100), 
        2
    ) as percentage
FROM interests i
JOIN user_interests ui ON i.id = ui.interest_id
GROUP BY i.id, i.name, i.emoticon
ORDER BY user_count DESC
LIMIT 20;


-- Moderation Analytics
CREATE OR REPLACE VIEW moderation_analytics AS
SELECT 
    COUNT(*) AS total_reports,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_reports,
    COUNT(CASE WHEN status = 'reviewed' THEN 1 END) AS reviewed_reports,
    COUNT(CASE WHEN status = 'action_taken' THEN 1 END) AS action_taken_reports,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS reports_today,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS reports_this_week,
    ROUND(
        (
            COUNT(CASE WHEN status = 'action_taken' THEN 1 END)::numeric /
            NULLIF(COUNT(CASE WHEN status != 'pending' THEN 1 END), 0)
        ) * 100,
        2
    ) AS action_rate
FROM user_reports;
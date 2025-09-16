-- =============== ANALYTICS FUNCTIONS ===============

-- Function to get analytics overview with date filtering
CREATE OR REPLACE FUNCTION get_analytics_overview(
    date_range text DEFAULT 'month',
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL
)
RETURNS TABLE (
    total_users bigint,
    active_users bigint,
    total_revenue numeric,
    total_subscriptions bigint,
    growth_rate numeric,
    churn_rate numeric
) AS $$
DECLARE
    filter_start_date date;
    filter_end_date date;
BEGIN
    -- Set date range based on parameter
    CASE date_range
        WHEN 'today' THEN
            filter_start_date := CURRENT_DATE;
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'week' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '7 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'month' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '30 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'quarter' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '90 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'year' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '365 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'custom' THEN
            filter_start_date := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
            filter_end_date := COALESCE(end_date, CURRENT_DATE + INTERVAL '1 day');
        ELSE
            filter_start_date := CURRENT_DATE - INTERVAL '30 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
    END CASE;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_profiles)::bigint as total_users,
        (SELECT COUNT(*) FROM user_profiles WHERE status = 'active')::bigint as active_users,
        COALESCE((SELECT SUM(amount_cents)::float / 100 FROM payments WHERE status = 'succeeded'), 0)::numeric as total_revenue,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')::bigint as total_subscriptions,
        COALESCE((SELECT uao.growth_rate FROM user_analytics_overview uao), 0)::numeric as growth_rate,
        COALESCE((SELECT rao.churn_rate FROM revenue_analytics_overview rao), 0)::numeric as churn_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get user analytics with chart data
CREATE OR REPLACE FUNCTION get_user_analytics(
    date_range text DEFAULT 'month'
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'new_users_today', (SELECT new_users_today FROM user_analytics_overview),
        'new_users_this_week', (SELECT new_users_this_week FROM user_analytics_overview),
        'new_users_this_month', (SELECT new_users_this_month FROM user_analytics_overview),
        'user_retention_rate', COALESCE((SELECT AVG(retention_rate) FROM user_retention_analytics), 0),
        'user_growth_data', (
            SELECT json_agg(
                json_build_object(
                    'label', label,
                    'value', value
                ) ORDER BY date
            )
            FROM user_growth_chart_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue analytics
CREATE OR REPLACE FUNCTION get_revenue_analytics(
    date_range text DEFAULT 'month'
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'daily_revenue', COALESCE((SELECT daily_revenue FROM revenue_analytics_overview), 0),
        'weekly_revenue', COALESCE((SELECT weekly_revenue FROM revenue_analytics_overview), 0),
        'monthly_revenue', COALESCE((SELECT monthly_revenue FROM revenue_analytics_overview), 0),
        'revenue_growth_rate', COALESCE((SELECT revenue_growth_rate FROM revenue_analytics_overview), 0),
        'revenue_chart_data', (
            SELECT json_agg(
                json_build_object(
                    'label', label,
                    'value', value
                ) ORDER BY date
            )
            FROM revenue_chart_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get content analytics
CREATE OR REPLACE FUNCTION get_content_analytics(
    date_range text DEFAULT 'month'
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_meetups', (SELECT total_meetups FROM content_analytics_overview),
        'total_events', (SELECT total_events FROM content_analytics_overview),
        'total_chats', (SELECT total_chats FROM content_analytics_overview),
        'content_engagement_rate', COALESCE((SELECT content_engagement_rate FROM content_analytics_overview), 0)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to export analytics data
CREATE OR REPLACE FUNCTION export_analytics_data(
    export_format text DEFAULT 'json',
    data_type text DEFAULT 'overview',
    date_range text DEFAULT 'month'
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    CASE data_type
        WHEN 'users' THEN
            result := get_user_analytics(date_range);
        WHEN 'revenue' THEN
            result := get_revenue_analytics(date_range);
        WHEN 'content' THEN
            result := get_content_analytics(date_range);
        ELSE
            SELECT json_build_object(
                'overview', (SELECT row_to_json(t) FROM (SELECT * FROM get_analytics_overview(date_range)) t),
                'users', get_user_analytics(date_range),
                'revenue', get_revenue_analytics(date_range),
                'content', get_content_analytics(date_range),
                'exported_at', NOW(),
                'date_range', date_range
            ) INTO result;
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get geographic distribution
CREATE OR REPLACE FUNCTION get_geographic_analytics()
RETURNS json AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'country', current_country,
                'city', current_city,
                'user_count', user_count,
                'new_users_this_month', new_users_this_month
            )
        )
        FROM geographic_analytics
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get popular interests
CREATE OR REPLACE FUNCTION get_popular_interests()
RETURNS json AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'name', name,
                'emoticon', emoticon,
                'user_count', user_count,
                'percentage', percentage
            )
        )
        FROM popular_interests_analytics
    );
END;
$$ LANGUAGE plpgsql;
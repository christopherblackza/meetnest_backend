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
    total_subscriptions bigint,
    total_reports bigint
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
        (SELECT COUNT(*) FROM user_profiles)::bigint AS total_users,
        (SELECT COUNT(*) FROM user_profiles WHERE status = 'active')::bigint AS active_users,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND created_at BETWEEN filter_start_date AND filter_end_date)::bigint AS total_subscriptions,
        (SELECT COUNT(*) FROM user_reports WHERE created_at BETWEEN filter_start_date AND filter_end_date)::bigint AS total_reports;
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
        'new_users_today', (SELECT new_users_today FROM view_user_analytics_overview),
        'new_users_this_week', (SELECT new_users_this_week FROM view_user_analytics_overview),
        'new_users_this_month', (SELECT new_users_this_month FROM view_user_analytics_overview),
        'user_retention_rate', COALESCE((SELECT AVG(retention_rate) FROM view_user_retention_analytics), 0),
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
        'daily_revenue', COALESCE((SELECT daily_revenue FROM view_revenue_analytics_overview), 0),
        'weekly_revenue', COALESCE((SELECT weekly_revenue FROM view_revenue_analytics_overview), 0),
        'monthly_revenue', COALESCE((SELECT monthly_revenue FROM view_revenue_analytics_overview), 0),
        'revenue_growth_rate', COALESCE((SELECT revenue_growth_rate FROM view_revenue_analytics_overview), 0),
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
        'total_meetups', (SELECT total_meetups FROM view.content_analytics_overview),
        'total_events', (SELECT total_events FROM view.content_analytics_overview),
        'total_chats', (SELECT total_chats FROM view.content_analytics_overview),
        'content_engagement_rate', COALESCE((SELECT content_engagement_rate FROM view.content_analytics_overview), 0)
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

-- Function to get user reports grid with proper foreign key relationships
CREATE OR REPLACE FUNCTION get_user_reports_grid(
    page_num integer DEFAULT 0,
    page_size integer DEFAULT 10,
    sort_by text DEFAULT 'created_at',
    sort_order text DEFAULT 'desc',
    search_text text DEFAULT NULL,
    filter_status text DEFAULT NULL,
    filter_reason text DEFAULT NULL,
    filter_date_from timestamptz DEFAULT NULL,
    filter_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    reporter_id uuid,
    reported_id uuid,
    reviewer_id uuid,
    reason text,
    details text,
    status text,
    created_at timestamptz,
    updated_at timestamptz,
    reporter_display_name text,
    reporter_email text,
    reported_display_name text,
    reported_email text,
    total_count bigint
) AS $$
DECLARE
    offset_val integer;
    query_text text;
    count_query text;
    total_records bigint;
BEGIN
    -- Calculate offset
    offset_val := page_num * page_size;
    
    -- Build the main query
    query_text := '
        SELECT 
            ur.id,
            ur.reporter_id,
            ur.reported_id,
            ur.reviewer_id,
            ur.reason,
            ur.details,
            ur.status,
            ur.created_at,
            ur.updated_at,
            reporter.display_name as reporter_display_name,
            reporter.email as reporter_email,
            reported.display_name as reported_display_name,
            reported.email as reported_email,
            (SELECT COUNT(*) FROM user_reports ur2 WHERE 1=1';
    
    -- Build the count query
    count_query := 'SELECT COUNT(*) FROM user_reports ur WHERE 1=1';
    
    -- Add search condition
    IF search_text IS NOT NULL THEN
        query_text := query_text || ' AND (ur.reason ILIKE ''%' || search_text || '%'' OR ur.details ILIKE ''%' || search_text || '%'')';
        count_query := count_query || ' AND (ur.reason ILIKE ''%' || search_text || '%'' OR ur.details ILIKE ''%' || search_text || '%'')';
    END IF;
    
    -- Add status filter
    IF filter_status IS NOT NULL THEN
        query_text := query_text || ' AND ur.status = ''' || filter_status || '''''';
        count_query := count_query || ' AND ur.status = ''' || filter_status || '''''';
    END IF;
    
    -- Add reason filter
    IF filter_reason IS NOT NULL THEN
        query_text := query_text || ' AND ur.reason = ''' || filter_reason || '''''';
        count_query := count_query || ' AND ur.reason = ''' || filter_reason || '''''';
    END IF;
    
    -- Add date filters
    IF filter_date_from IS NOT NULL THEN
        query_text := query_text || ' AND ur.created_at >= ''' || filter_date_from || '''''';
        count_query := count_query || ' AND ur.created_at >= ''' || filter_date_from || '''''';
    END IF;
    
    IF filter_date_to IS NOT NULL THEN
        query_text := query_text || ' AND ur.created_at <= ''' || filter_date_to || '''''';
        count_query := count_query || ' AND ur.created_at <= ''' || filter_date_to || '''''';
    END IF;
    
    -- Complete the main query
    query_text := query_text || ') as total_count
        FROM user_reports ur
        LEFT JOIN user_profiles reporter ON ur.reporter_id = reporter.user_id
        LEFT JOIN user_profiles reported ON ur.reported_id = reported.user_id
        WHERE 1=1';
    
    -- Add the same filters to main query
    IF search_text IS NOT NULL THEN
        query_text := query_text || ' AND (ur.reason ILIKE ''%' || search_text || '%'' OR ur.details ILIKE ''%' || search_text || '%'')';
    END IF;
    
    IF filter_status IS NOT NULL THEN
        query_text := query_text || ' AND ur.status = ''' || filter_status || '''''';
    END IF;
    
    IF filter_reason IS NOT NULL THEN
        query_text := query_text || ' AND ur.reason = ''' || filter_reason || '''''';
    END IF;
    
    IF filter_date_from IS NOT NULL THEN
        query_text := query_text || ' AND ur.created_at >= ''' || filter_date_from || '''''';
    END IF;
    
    IF filter_date_to IS NOT NULL THEN
        query_text := query_text || ' AND ur.created_at <= ''' || filter_date_to || '''''';
    END IF;
    
    -- Add sorting
    query_text := query_text || ' ORDER BY ur.' || sort_by || ' ' || sort_order || 
                  ' LIMIT ' || page_size || ' OFFSET ' || offset_val;
    
    -- Execute count query to get total records
    EXECUTE count_query INTO total_records;
    
    -- Return the query results with total count
    RETURN QUERY EXECUTE query_text;
    
    -- Also return total count in each row
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, 
                        NULL::timestamptz, NULL::timestamptz, NULL::text, NULL::text, NULL::text, NULL::text, total_records
                 WHERE false; -- This ensures we only get the total count once
END;
$$ LANGUAGE plpgsql;
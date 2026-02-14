-- TABLES


-- FUNCTIONS
CREATE OR REPLACE FUNCTION notify_friend_request_push()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    sender_profile RECORD;
BEGIN
    -- Get the sender's profile details
    SELECT display_name, avatar_url INTO sender_profile
    FROM public.user_profiles
    WHERE user_id = NEW.sender_id;

    -- Send the HTTP POST request (same style as notify_dm_push)
    PERFORM http_post(
        'https://meetnestmcp-production.up.railway.app/notifications/friend-request',
        json_build_object(
            'receiver_id', NEW.receiver_id,
            'sender_id', NEW.sender_id,
            'sender_display_name', COALESCE(sender_profile.display_name, 'Unknown User'),
            'sender_avatar_url', sender_profile.avatar_url,
            'friend_request_id', NEW.id
        )::jsonb
    );

    RETURN NEW;
END;
$$;



-- TRIGGERS
-- Trigger on friend_requests
DROP TRIGGER IF EXISTS trg_notify_friend_request_push ON friend_requests;
CREATE TRIGGER trg_notify_friend_request_push
AFTER INSERT ON friend_requests 
FOR EACH ROW EXECUTE FUNCTION notify_friend_request_push();


CREATE OR REPLACE FUNCTION get_users_list(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search_term TEXT DEFAULT NULL,
    p_current_city TEXT DEFAULT NULL,
    p_current_country TEXT DEFAULT NULL,
    p_country_of_origin TEXT DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_min_age INTEGER DEFAULT NULL,
    p_max_age INTEGER DEFAULT NULL,
    p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    full_name TEXT,
    email TEXT,
    bio TEXT,
    age INTEGER,
    occupation TEXT,
    country_of_origin TEXT,
    current_city TEXT,
    current_country TEXT,
    avatar_url TEXT,
    instagram_handle TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    gender TEXT,
    role TEXT,
    auth_provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    show_location BOOLEAN,
    allow_messages BOOLEAN,
    language TEXT,
    notifications_enabled BOOLEAN,
    push_token TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_users BIGINT;
BEGIN
    -- Count total users for pagination
    SELECT COUNT(*) INTO total_users
    FROM public.user_profiles up
    LEFT JOIN public.user_preferences pref ON up.user_id = pref.user_id
    WHERE 
        (p_exclude_user_id IS NULL OR up.user_id != p_exclude_user_id)
        AND (p_search_term IS NULL OR 
             up.display_name ILIKE '%' || p_search_term || '%' OR 
             up.full_name ILIKE '%' || p_search_term || '%' OR
             up.bio ILIKE '%' || p_search_term || '%')
        AND (p_current_city IS NULL OR up.current_city ILIKE '%' || p_current_city || '%')
        AND (p_current_country IS NULL OR up.current_country ILIKE '%' || p_current_country || '%')
        AND (p_country_of_origin IS NULL OR up.country_of_origin ILIKE '%' || p_country_of_origin || '%')
        AND (p_gender IS NULL OR up.gender = p_gender)
        AND (p_min_age IS NULL OR EXTRACT(YEAR FROM AGE(up.date_of_birth)) >= p_min_age)
        AND (p_max_age IS NULL OR EXTRACT(YEAR FROM AGE(up.date_of_birth)) <= p_max_age);

    -- Return user data
    RETURN QUERY
    SELECT 
        up.user_id,
        up.display_name,
        up.full_name,
        up.email,
        up.bio,
        EXTRACT(YEAR FROM AGE(up.date_of_birth))::INTEGER AS age,
        up.occupation,
        up.country_of_origin,
        up.current_city,
        up.current_country,
        up.avatar_url,
        up.instagram_handle,
        CASE 
            WHEN COALESCE(pref.show_location, true) THEN up.latitude
            ELSE NULL
        END AS latitude,
        CASE 
            WHEN COALESCE(pref.show_location, true) THEN up.longitude
            ELSE NULL
        END AS longitude,
        up.gender,
        up.role,
        up.auth_provider,
        up.created_at,
        COALESCE(pref.show_location, true) AS show_location,
        COALESCE(pref.allow_messages, true) AS allow_messages,
        COALESCE(pref.language, 'en') AS language,
        COALESCE(pref.notifications_enabled, true) AS notifications_enabled,
        upt.token AS push_token,
        total_users AS total_count
    FROM public.user_profiles up
    LEFT JOIN public.user_preferences pref ON up.user_id = pref.user_id
    LEFT JOIN public.user_push_tokens upt ON up.user_id = upt.user_id
    WHERE 
        (p_exclude_user_id IS NULL OR up.user_id != p_exclude_user_id)
        AND (p_search_term IS NULL OR 
             up.display_name ILIKE '%' || p_search_term || '%' OR 
             up.full_name ILIKE '%' || p_search_term || '%' OR
             up.bio ILIKE '%' || p_search_term || '%')
        AND (p_current_city IS NULL OR up.current_city ILIKE '%' || p_current_city || '%')
        AND (p_current_country IS NULL OR up.current_country ILIKE '%' || p_current_country || '%')
        AND (p_country_of_origin IS NULL OR up.country_of_origin ILIKE '%' || p_country_of_origin || '%')
        AND (p_gender IS NULL OR up.gender = p_gender)
        AND (p_min_age IS NULL OR EXTRACT(YEAR FROM AGE(up.date_of_birth)) >= p_min_age)
        AND (p_max_age IS NULL OR EXTRACT(YEAR FROM AGE(up.date_of_birth)) <= p_max_age)
    ORDER BY up.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
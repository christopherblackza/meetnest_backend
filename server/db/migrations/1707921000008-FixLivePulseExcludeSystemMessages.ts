export async function up(sql: any) {
  await sql`
    CREATE OR REPLACE FUNCTION public.get_live_pulse()
     RETURNS json
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    DECLARE
      v_result json;
    BEGIN
      WITH
      active_users AS (
        SELECT
          user_id, display_name, avatar_url, latitude, longitude, current_city, current_country, last_active_at
        FROM user_profiles
        WHERE last_active_at >= now() - interval '15 minutes'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
      ),
      active_activities AS (
        SELECT
          a.id, a.title, a.type, a.latitude, a.longitude, a.location_name,
          a.created_at, a.start_date_time,
          (SELECT count(*) FROM chats c JOIN participants p ON p.chat_id = c.id WHERE c.activity_id = a.id) AS participant_count
        FROM activities a
        WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND a.created_at >= now() - interval '7 days'
        ORDER BY a.created_at DESC
        LIMIT 100
      ),
      hotspots AS (
        SELECT
          round(latitude::numeric, 1) AS lat,
          round(longitude::numeric, 1) AS lng,
          count(*) AS activity_count,
          count(DISTINCT created_by) AS unique_creators
        FROM activities
        WHERE created_at >= now() - interval '7 days'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY round(latitude::numeric, 1), round(longitude::numeric, 1)
        HAVING count(*) >= 1
        ORDER BY activity_count DESC
        LIMIT 50
      ),
      recent_signups AS (
        SELECT 'signup' AS event_type, user_id AS id, display_name AS title,
               avatar_url AS image, current_city AS subtitle, created_at
        FROM user_profiles
        WHERE created_at >= now() - interval '24 hours'
        ORDER BY created_at DESC LIMIT 20
      ),
      recent_activities AS (
        SELECT 'activity' AS event_type, a.id, a.title,
               a.image_url AS image, a.type AS subtitle, a.created_at
        FROM activities a
        WHERE a.created_at >= now() - interval '24 hours'
        ORDER BY a.created_at DESC LIMIT 20
      ),
      recent_friends AS (
        SELECT 'connection' AS event_type, f.id,
               u1.display_name || ' & ' || u2.display_name AS title,
               u1.avatar_url AS image, '' AS subtitle, f.created_at
        FROM friends f
        JOIN user_profiles u1 ON u1.user_id = f.user_id
        JOIN user_profiles u2 ON u2.user_id = f.friend_id
        WHERE f.created_at >= now() - interval '24 hours'
        ORDER BY f.created_at DESC LIMIT 20
      ),
      feed AS (
        SELECT * FROM recent_signups
        UNION ALL SELECT * FROM recent_activities
        UNION ALL SELECT * FROM recent_friends
        ORDER BY created_at DESC
        LIMIT 30
      ),
      summary AS (
        SELECT
          (SELECT count(*) FROM user_profiles WHERE last_active_at >= now() - interval '15 minutes') AS online_now,
          (SELECT count(*) FROM activities WHERE created_at >= now() - interval '24 hours') AS activities_today,
          (SELECT count(*) FROM user_profiles WHERE created_at >= now() - interval '24 hours') AS signups_today,
          (SELECT count(*) FROM friends WHERE created_at >= now() - interval '24 hours') AS connections_today,
          (SELECT count(*) FROM messages WHERE created_at >= now() - interval '24 hours' AND system_user_id IS NULL) AS messages_today
      )
      SELECT json_build_object(
        'summary',    (SELECT row_to_json(summary) FROM summary),
        'active_users', (SELECT json_agg(row_to_json(active_users)) FROM active_users),
        'active_activities', (SELECT json_agg(row_to_json(active_activities)) FROM active_activities),
        'hotspots',   (SELECT json_agg(row_to_json(hotspots)) FROM hotspots),
        'feed',       (SELECT json_agg(row_to_json(feed)) FROM feed)
      ) INTO v_result;

      RETURN v_result;
    END;
    $function$
  `;
}

export async function down(sql: any) {
  await sql`
    CREATE OR REPLACE FUNCTION public.get_live_pulse()
     RETURNS json
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    DECLARE
      v_result json;
    BEGIN
      WITH
      active_users AS (
        SELECT
          user_id, display_name, avatar_url, latitude, longitude, current_city, current_country, last_active_at
        FROM user_profiles
        WHERE last_active_at >= now() - interval '15 minutes'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
      ),
      active_activities AS (
        SELECT
          a.id, a.title, a.type, a.latitude, a.longitude, a.location_name,
          a.created_at, a.start_date_time,
          (SELECT count(*) FROM chats c JOIN participants p ON p.chat_id = c.id WHERE c.activity_id = a.id) AS participant_count
        FROM activities a
        WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND a.created_at >= now() - interval '7 days'
        ORDER BY a.created_at DESC
        LIMIT 100
      ),
      hotspots AS (
        SELECT
          round(latitude::numeric, 1) AS lat,
          round(longitude::numeric, 1) AS lng,
          count(*) AS activity_count,
          count(DISTINCT created_by) AS unique_creators
        FROM activities
        WHERE created_at >= now() - interval '7 days'
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY round(latitude::numeric, 1), round(longitude::numeric, 1)
        HAVING count(*) >= 1
        ORDER BY activity_count DESC
        LIMIT 50
      ),
      recent_signups AS (
        SELECT 'signup' AS event_type, user_id AS id, display_name AS title,
               avatar_url AS image, current_city AS subtitle, created_at
        FROM user_profiles
        WHERE created_at >= now() - interval '24 hours'
        ORDER BY created_at DESC LIMIT 20
      ),
      recent_activities AS (
        SELECT 'activity' AS event_type, a.id, a.title,
               a.image_url AS image, a.type AS subtitle, a.created_at
        FROM activities a
        WHERE a.created_at >= now() - interval '24 hours'
        ORDER BY a.created_at DESC LIMIT 20
      ),
      recent_friends AS (
        SELECT 'connection' AS event_type, f.id,
               u1.display_name || ' & ' || u2.display_name AS title,
               u1.avatar_url AS image, '' AS subtitle, f.created_at
        FROM friends f
        JOIN user_profiles u1 ON u1.user_id = f.user_id
        JOIN user_profiles u2 ON u2.user_id = f.friend_id
        WHERE f.created_at >= now() - interval '24 hours'
        ORDER BY f.created_at DESC LIMIT 20
      ),
      feed AS (
        SELECT * FROM recent_signups
        UNION ALL SELECT * FROM recent_activities
        UNION ALL SELECT * FROM recent_friends
        ORDER BY created_at DESC
        LIMIT 30
      ),
      summary AS (
        SELECT
          (SELECT count(*) FROM user_profiles WHERE last_active_at >= now() - interval '15 minutes') AS online_now,
          (SELECT count(*) FROM activities WHERE created_at >= now() - interval '24 hours') AS activities_today,
          (SELECT count(*) FROM user_profiles WHERE created_at >= now() - interval '24 hours') AS signups_today,
          (SELECT count(*) FROM friends WHERE created_at >= now() - interval '24 hours') AS connections_today,
          (SELECT count(*) FROM messages WHERE created_at >= now() - interval '24 hours') AS messages_today
      )
      SELECT json_build_object(
        'summary',    (SELECT row_to_json(summary) FROM summary),
        'active_users', (SELECT json_agg(row_to_json(active_users)) FROM active_users),
        'active_activities', (SELECT json_agg(row_to_json(active_activities)) FROM active_activities),
        'hotspots',   (SELECT json_agg(row_to_json(hotspots)) FROM hotspots),
        'feed',       (SELECT json_agg(row_to_json(feed)) FROM feed)
      ) INTO v_result;

      RETURN v_result;
    END;
    $function$
  `;
}

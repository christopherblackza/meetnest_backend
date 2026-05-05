-- ============================================================================
-- FOUNDER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_founder_profile();
CREATE OR REPLACE FUNCTION get_founder_profile()
RETURNS TABLE (
  user_id uuid, display_name text, full_name text, avatar_url text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT up.user_id, up.display_name, up.full_name, up.avatar_url
  FROM user_profiles up
  JOIN user_badges ub ON ub.user_id = up.user_id
  WHERE ub.badge = 'founder'
  LIMIT 1;
$$;

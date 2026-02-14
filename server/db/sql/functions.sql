-- Is email available
CREATE OR REPLACE FUNCTION public.is_email_available(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE lower(email) = lower(p_email)
  );
END;
$$;
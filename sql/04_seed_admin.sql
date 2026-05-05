-- ============================================================================
-- SEED: Create admin account
-- Run this in the Supabase SQL Editor (as service role / postgres)
-- Update the email and password below before running.
-- ============================================================================

DO $$
DECLARE
  v_admin_email    text    := 'admin@meetro.app';
  v_admin_password text    := 'JesusFreak25*';
  v_display_name   text    := 'Meetro';
  v_full_name      text    := 'Meetro Admin';
  v_user_id        uuid;
BEGIN

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_admin_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      role,
      aud,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', v_display_name),
      false,
      '',
      '',
      '',
      ''
    );

    RAISE NOTICE 'Created auth.users record: %', v_user_id;
  ELSE
    RAISE NOTICE 'Auth user already exists: %', v_user_id;
  END IF;

  INSERT INTO user_profiles (
    user_id,
    email,
    display_name,
    full_name,
    role,
    avatar_url,
    status,
    country_of_origin,
    date_of_birth,
    auth_provider,
    trust_score,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_admin_email,
    v_display_name,
    v_full_name,
    'admin',
    'https://whnacaytkuruluermqum.supabase.co/storage/v1/object/public/assets/logo.png',
    'active',
    'South Africa',
    '1995-02-25'::date,
    'email',
    100,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET role        = 'admin',
        status      = 'active',
        updated_at  = now();

  RAISE NOTICE 'Admin profile upserted for user_id: %', v_user_id;

END $$;
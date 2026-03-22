-- ============================================================================
-- MEETRO DATABASE SCHEMA v2

-- ============================================================================
-- 1. USERS & PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  full_name text,
  email text UNIQUE,
  bio text,
  date_of_birth date,
  country_of_origin text,
  current_city text,
  current_country text,
  avatar_url text,
  mobile_number text,
  instagram_handle text,
  linkedin_handle text,
  referral_source text,
  referral_source_other text,
  latitude double precision,
  longitude double precision,
  gender text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'co-founder')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  auth_provider text NOT NULL DEFAULT 'email',
  is_bot boolean DEFAULT false,
  verification_photo_url text,
  location text,
  geo_location geography(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  last_active_at timestamptz,
  trust_score integer DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),

  CONSTRAINT referral_source_check CHECK (
    referral_source IS NULL OR referral_source IN (
      'google', 'instagram', 'tiktok', 'youtube', 'facebook',
      'twitter', 'friend_family', 'app_store', 'other'
    )
  ),
  CONSTRAINT referral_source_other_check CHECK (
    referral_source <> 'other' OR referral_source_other IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  show_location boolean DEFAULT true,
  allow_messages boolean DEFAULT true,
  show_age boolean DEFAULT false,
  language text DEFAULT 'en',
  notifications_enabled boolean DEFAULT true,
  hide_nearby_distance boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_photos (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT user_push_tokens_user_id_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  last_seen timestamptz,
  app_version text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS profile_views (
  viewer_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  viewed_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT timezone('utc', now()),
  PRIMARY KEY (viewer_id, viewed_id)
);

CREATE TABLE IF NOT EXISTS boosts (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  start_time timestamptz DEFAULT timezone('utc', now()),
  end_time timestamptz
);


-- Badges assigned to users (admin-managed or system-assigned)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  badge text NOT NULL,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES user_profiles(user_id),
  UNIQUE (user_id, badge)
);


-- ============================================================================
-- 2. LANGUAGES, COUNTRIES & INTERESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS languages (
  code text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_languages (
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  language_code text REFERENCES languages(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, language_code)
);

CREATE TABLE IF NOT EXISTS user_countries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  country_code text NOT NULL,
  country_name text NOT NULL,
  year_visited integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, country_code)
);

CREATE TABLE IF NOT EXISTS interests (
  id bigserial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  emoticon text
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  interest_id bigint REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS interest_categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  emoticon text NOT NULL
);

CREATE TABLE IF NOT EXISTS interest_category_map (
  interest_id int NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  category_id int NOT NULL REFERENCES interest_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (interest_id, category_id)
);


-- ============================================================================
-- 3. SOCIAL (FRIENDS, BLOCKS, REFERENCES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  friend_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS user_references (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  meeting_context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_reference CHECK (author_id != subject_id),
  CONSTRAINT unique_author_subject UNIQUE (author_id, subject_id)
);


-- ============================================================================
-- 4. SYSTEM USERS & BOTS (must come before chats/messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_users (
  system_user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  avatar_url text,
  is_system_account boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  description text,
  ai_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now())
);


-- ============================================================================
-- 5. LOCATIONS (CITIES, CLIENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  location_id bigint NOT NULL,
  location_type text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (location_id, location_type)
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type IN ('bar', 'restaurant', 'cafe', 'gym', 'market', 'social', 'volunteering')),
  description text,
  logo_url text,
  image_url text[],
  latitude numeric(10, 6) NOT NULL,
  longitude numeric(10, 6) NOT NULL,
  geo_location geography(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  address text,
  phone text,
  website_url text,
  instagram_url text,
  google_maps_link text,
  contact_number text,
  email text,
  rating numeric(2, 1) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- 6. ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('event', 'meetup', 'blend')),
  title text,
  description text,
  intent activity_intent,
  latitude double precision,
  longitude double precision,
  location geography(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  start_date_time timestamptz,
  end_date_time timestamptz,
  meeting_time timestamptz,
  expires_at timestamptz,
  time_type text CHECK (time_type IN ('flexible', 'specific')),
  time_window text CHECK (time_window IN ('day', 'week', 'month')),
  is_public boolean DEFAULT true,
  female_only boolean DEFAULT false,
  max_participants integer,
  image_url text,
  video_url text,
  location_name text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 7. CHATS & MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type text NOT NULL CHECK (chat_type IN ('direct', 'meetup', 'event', 'trip', 'blend')),
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES user_profiles(user_id),
  system_user_id uuid REFERENCES system_users(system_user_id),
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  hidden boolean DEFAULT false,
  rsvp_status text CHECK (rsvp_status IN ('going', 'maybe', 'not_going')),
  attended boolean DEFAULT null,
  UNIQUE (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id),
  system_user_id uuid REFERENCES system_users(system_user_id),
  message text,
  image_url text,
  message_type text NOT NULL CHECK (message_type IN ('text', 'image', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_message_author CHECK (
    (user_id IS NOT NULL AND bot_id IS NULL AND system_user_id IS NULL) OR
    (user_id IS NULL AND bot_id IS NOT NULL AND system_user_id IS NULL) OR
    (user_id IS NULL AND bot_id IS NULL AND system_user_id IS NOT NULL)
  )
);

ALTER TABLE messages REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS chat_unread_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  chat_type text NOT NULL CHECK (chat_type IN ('direct', 'meetup', 'event', 'trip', 'blend')),
  chat_id uuid NOT NULL,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS system_message_templates (
  key text PRIMARY KEY,
  content text NOT NULL,
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- 8. ACTIVITY REVIEWS & ATTENDANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (activity_id)
);


-- ============================================================================
-- 9. NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (
    type IN (
      'friend_request', 'message', 'system', 
      'new_activity_nearby', 'welcome_to_chat', 'blend_heating_up',
      'friend_request_accepted'
    )
  ),
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);



-- ============================================================================
-- 11. MODERATION & REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'dismissed', 'resolved', 'action_taken')
  ),
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES user_profiles(user_id),
  CONSTRAINT uq_reporter_reported_reason UNIQUE (reporter_id, reported_id, reason)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL CHECK (
    action_type IN ('content_removed', 'user_suspended', 'user_banned', 'warning_issued', 'fake_report_dismissed')
  ),
  reason text NOT NULL,
  details text,
  report_id uuid REFERENCES user_reports(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('profile', 'message', 'bio', 'photo')),
  content_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  flag_reason text NOT NULL,
  risk_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'removed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id)
);


-- ============================================================================
-- 12. LOCAL AMBASSADORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS local_ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  country text NOT NULL,
  city text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  priority integer DEFAULT 1,
  approved_by uuid REFERENCES user_profiles(user_id),
  approved_at timestamptz DEFAULT timezone('utc', now()),
  created_at timestamptz DEFAULT timezone('utc', now()),
  CONSTRAINT local_ambassadors_user_country_unique UNIQUE (user_id, country)
);






-- ============================================================================
-- 14. INTERNAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

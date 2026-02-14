-- =============================================
-- 1. SYSTEM USERS & BOTS (needed by chats/messages)
-- =============================================
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

-- =============================================
-- 2. USERS & PROFILES
-- =============================================
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
    role text DEFAULT 'user' CHECK (role IN ('user','admin','moderator','co-founder')),
    status text DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
    auth_provider text NOT NULL DEFAULT 'email',
    is_founder boolean DEFAULT false,
    is_bot boolean DEFAULT false,
    verification_photo_url text,
    trust_score integer DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    geo_location geography(POINT, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED,
    CONSTRAINT referral_source_check CHECK (
        referral_source IN ('google','instagram','tiktok','youtube','facebook','twitter','friend_family','app_store','other')
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

CREATE TABLE IF NOT EXISTS languages (
    code text PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_languages (
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    language_code text REFERENCES languages(code) ON DELETE CASCADE,
    PRIMARY KEY (user_id, language_code)
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

CREATE TABLE IF NOT EXISTS user_photos (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    photo_url text NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS user_push_tokens (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    token text NOT NULL,
    platform text NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- =============================================
-- 3. ACTIVITIES
-- =============================================
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Common fields
  created_by uuid REFERENCES user_profiles(user_id) ON DELETE
  SET NULL,
    type text NOT NULL CHECK (type IN ('event', 'meetup', 'blend')),
    title text,
    description text,
    emoticon text,
    intent text CHECK (
      intent IN (
        'social',
        'food',
        'night',
        'outdoors',
        'sports',
        'work',
        'other'
      )
    ),
    latitude double precision,
    longitude double precision,
    -- PostGIS geography column for location-based queries
    location geography(POINT, 4326) GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    ) STORED,
    -- Date/time fields
    start_date_time timestamptz,
    end_date_time timestamptz,
    meeting_time timestamptz,
    expires_at timestamptz,
    -- Time Type
    time_type text CHECK (time_type IN ('flexible', 'specific')),
    -- Visibility & access control
    is_public boolean DEFAULT true,
    female_only boolean DEFAULT false,
    max_participants integer,
    -- Media
    image_url text,
    video_url text,
    -- Metadata
    created_at timestamptz DEFAULT timezone('utc', now()),
    updated_at timestamptz DEFAULT timezone('utc', now())
);

-- =============================================
-- 4. CITIES
-- =============================================
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


-- =============================================
-- 5. CHATS & MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_type text NOT NULL CHECK (chat_type IN ('direct','trip','event','meetup','blend')),
    trip_id uuid REFERENCES cities(id) ON DELETE CASCADE,
    activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
    owner_user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    system_user_id uuid REFERENCES system_users(system_user_id),
    is_system_chat boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (chat_type, trip_id),
    UNIQUE (chat_type, activity_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    bot_id uuid REFERENCES bots(id),
    system_user_id uuid REFERENCES system_users(system_user_id),
    message text,
    image_url text,
    message_type text NOT NULL CHECK (message_type IN ('text','image','system')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_message_author CHECK (
        (user_id IS NOT NULL AND bot_id IS NULL AND system_user_id IS NULL) OR
        (user_id IS NULL AND bot_id IS NOT NULL AND system_user_id IS NULL) OR
        (user_id IS NULL AND bot_id IS NULL AND system_user_id IS NOT NULL)
    )
);

ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =============================================
-- 6. USER INTERACTIONS & REPORTS
-- =============================================
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

CREATE TABLE IF NOT EXISTS user_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    reported_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending','reviewed','dismissed','resolved','action_taken')
    ),
    created_at timestamptz DEFAULT timezone('utc', now()),
    updated_at timestamptz DEFAULT timezone('utc', now()),
    reviewed_at timestamptz,
    reviewer_id uuid REFERENCES user_profiles(user_id),
    CONSTRAINT uq_reporter_reported_reason UNIQUE (reporter_id, reported_id, reason)
);

CREATE TABLE IF NOT EXISTS participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    hidden boolean DEFAULT false,
    rsvp_status text CHECK (rsvp_status IN ('going','maybe','not_going')),
    UNIQUE (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

-- =============================================
-- 7. NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text NOT NULL CHECK (
        type IN ('meetup','event','friend_request','message','system','trip','new_activity_nearby','welcome_to_chat',
                 'meetup_heating_up','friend_request_accepted','hangout_request_accepted','hangout_request_received')
    ),
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz
);



-- =============================================
-- 8. OTHER TABLES (user_countries, references, boosts, local_ambassadors, profile_views, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS user_countries (
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL,
    visited_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, country_code)
);

CREATE TABLE IF NOT EXISTS user_activity_views (
    user_id uuid NOT NULL REFERENCES user_profiles(user_id),
    activity_id uuid NOT NULL REFERENCES activities(id),
    viewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS boosts (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    start_time timestamp with time zone DEFAULT timezone('utc'::text, now()),
    end_time timestamp with time zone
);

CREATE TABLE IF NOT EXISTS local_ambassadors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    country text NOT NULL,
    city text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','inactive')),
    priority integer DEFAULT 1,
    approved_by uuid REFERENCES user_profiles(user_id),
    approved_at timestamptz DEFAULT timezone('utc', now()),
    created_at timestamptz DEFAULT timezone('utc', now()),
    CONSTRAINT local_ambassadors_user_country_unique UNIQUE (user_id, country)
);

CREATE TABLE IF NOT EXISTS profile_views (
    viewer_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    viewed_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (viewer_id, viewed_id)
);

CREATE TABLE IF NOT EXISTS user_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    meeting_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_reference CHECK (author_id != subject_id),
    CONSTRAINT unique_author_subject UNIQUE (author_id, subject_id)
);

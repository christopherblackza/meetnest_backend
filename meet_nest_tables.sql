-- =============== USERS & PROFILES ===============

-- You don't need to create auth.users
-- Instead, create a profile table linked to it:

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    
    display_name text,
    full_name text,
    email text unique,
    bio text,
    date_of_birth date,
    occupation text,
    country_of_origin text,
    current_city text,
    current_country text,
    avatar_url text,
    instagram_handle text,
    latitude double precision,
    longitude double precision,
    location text,
    gender text,
    available_until timestamptz,
    is_verified boolean default false,
    role text default 'user' check (role in ('user', 'admin', 'moderator')),
    status text default 'active' check (status in ('active', 'suspended', 'banned')),
    auth_provider text not null default 'email',
    is_founder boolean default false,
    is_bot boolean default false,
    verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    trust_score integer default 100 check (trust_score >= 0 and trust_score <= 100)
    created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;


-- =============== FUTURE TRIPS ===============

CREATE TABLE IF NOT EXISTS future_trips (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references user_profiles(user_id) on delete cascade,
    city_id uuid references cities(id),
    start_date date,
    end_date date,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =============== MEETUPS ===============

CREATE TABLE IF NOT EXISTS meetups (
    id uuid default gen_random_uuid() primary key,
    created_by uuid references user_profiles(user_id) on delete set null,
    title text not null,
    emoticon text,
    meeting_time timestamp with time zone,
    is_public boolean default true,
    latitude double precision,
    longitude double precision,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =============== EVENTS ===============

CREATE TABLE IF NOT EXISTS events (
    id uuid default gen_random_uuid() primary key,
    created_by uuid references user_profiles(user_id) on delete set null,
    title text not null,
    description text,
    is_public boolean default true,
    latitude double precision not null,
    max_participants integer,
    longitude double precision not null,
    start_date_time timestamp with time zone not null,
    end_date_time timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    image_url text
);

-- Event Attendees
CREATE TABLE IF NOT EXISTS event_attendees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, user_id)  -- prevent duplicates
);

-- =============== OPTIONAL: USER PREFERENCES ===============

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid primary key references user_profiles(user_id) on delete cascade,
    show_location boolean default true,
    allow_messages boolean default true,
    show_age boolean default false,
    language text default 'en',
    notifications_enabled boolean default true,
    hide_nearby_distance boolean default false
);

CREATE TABLE IF NOT EXISTS genders (
    id serial primary key,
    name text unique not null
);

CREATE TABLE IF NOT EXISTS languages (
    code text primary key, -- e.g. 'en', 'es', 'fr'
    name text not null
);

CREATE TABLE IF NOT EXISTS user_languages (
    user_id uuid references user_profiles(user_id) on delete cascade,
    language_code text references languages(code) on delete cascade,
    primary key (user_id, language_code)
);

CREATE TABLE IF NOT EXISTS interests (
  id bigserial primary key,
  name text unique not null,
  emoticon text
);

CREATE TABLE IF NOT EXISTS user_interests (
    user_id uuid references user_profiles(user_id) on delete cascade,
    interest_id bigint references interests(id) on delete cascade,
    primary key (user_id, interest_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references user_profiles(user_id) on delete cascade,
  receiver_id uuid references user_profiles(user_id) on delete cascade,
  created_at timestamptz default timezone('utc', now()),
  unique (sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(user_id) on delete cascade,
  friend_id uuid references user_profiles(user_id) on delete cascade,
  created_at timestamptz default timezone('utc', now()),
  unique (user_id, friend_id)
);


CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_push_tokens add column platform text;

create index user_push_tokens_user_id_idx on user_push_tokens(user_id);
create unique index user_push_tokens_token_idx on user_push_tokens(token);


-- =============== UNREAD MESSAGE TRACKING ===============

-- Simplified table to track when user last read each chat
CREATE TABLE IF NOT EXISTS chat_unread_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_type TEXT NOT NULL CHECK (chat_type IN ('direct', 'meetup', 'event', 'trip')),
    chat_id UUID NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per chat
    UNIQUE(user_id, chat_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_user_id ON chat_unread_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_chat_id ON chat_unread_counts(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread_counts_user_chat ON chat_unread_counts(user_id, chat_id);



-- Optional index for faster lookups on unprocessed jobs
create index idx_push_queue_processed on public.push_notifications_queue (processed);

-- Cities Chat
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                     -- "Paris"
  display_name text NOT NULL,             -- "Paris, Île-de-France, France"
  location_id bigint NOT NULL,                  -- OpenStreetMap ID
  location_type text NOT NULL,                  -- "relation", "node", etc.
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  country text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (location_id, location_type)                -- ensures city is unique
);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type text NOT NULL CHECK (chat_type IN ('direct', 'trip', 'event', 'meetup')),
  trip_id uuid REFERENCES cities(id) ON DELETE CASCADE,     -- for 'trip' type
  event_id uuid REFERENCES events(id) ON DELETE CASCADE, -- for 'event' type
  meetup_id uuid REFERENCES meetups(id) ON DELETE CASCADE, -- for 'meetup' type
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (chat_type, trip_id),       -- ensures one city chat per city
  UNIQUE (chat_type, event_id),    -- ensures one event chat per event
  UNIQUE (chat_type, meetup_id)    -- ensures one meetup chat per meetup
);


-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  bot_id uuid references bots(id);
  created_at timestamptz DEFAULT now()
);

alter table messages
add constraint chk_message_author
  check (
    (user_id is not null and bot_id is null)
    or (user_id is null and bot_id is not null)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Interests
CREATE TABLE IF NOT EXISTS interest_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    emoticon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interest_category_map (
    interest_id INT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES interest_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (interest_id, category_id)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,          -- e.g. Free, Pro
  price_cents integer not null,
  currency text not null default 'USD',
  interval text not null check (interval in ('month', 'year')),
  description text,
  created_at timestamptz default now()
);

-- =============== SUBSCRIPTIONS / PREMIUM USERS ===============
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null check (status in ('active', 'past_due', 'canceled', 'trialing')),
  start_date timestamptz not null default now(),
  end_date timestamptz,  -- for cancellation / expiration
  cancel_at timestamptz, -- schedule cancellation
  created_at timestamptz default now()
);


CREATE TABLE IF NOT EXISTS user_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references user_profiles(user_id) on delete cascade,
    reported_id uuid not null references user_profiles(user_id) on delete cascade,
    reason text not null, -- short description of why user is being reported
    details text,         -- optional detailed message
    status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'action_taken')),
    created_at timestamptz default timezone('utc', now()),
    reviewed_at timestamptz,
    reviewer_id uuid references user_profiles(user_id)
);

alter table user_reports add constraint uq_reporter_reported_reason unique (reporter_id, reported_id, reason);

CREATE TABLE IF NOT EXISTS participants (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  hidden boolean default false;
  unique (chat_id, user_id)
);

-- User blocking table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Content moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('content_removed', 'user_suspended', 'user_banned', 'warning_issued', 'fake_report_dismissed')),
    reason TEXT NOT NULL,
    details TEXT,
    report_id UUID REFERENCES user_reports(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);




-- Not In Use
-- =============== TODO: Add optional ===============
-- Content flags table for tracking flagged content
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('profile', 'message', 'bio', 'photo')),
    content_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    flag_reason TEXT NOT NULL,
    risk_score INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS profile_views (
    viewer_id uuid references user_profiles(user_id) on delete cascade,
    viewed_id uuid references user_profiles(user_id) on delete cascade,
    viewed_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (viewer_id, viewed_id)
);

CREATE TABLE IF NOT EXISTS boosts (
    id bigserial primary key,
    user_id uuid references user_profiles(user_id) on delete cascade,
    start_time timestamp with time zone default timezone('utc'::text, now()),
    end_time timestamp with time zone
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  provider text not null,            -- 'stripe', 'payfast', etc
  provider_payment_id text not null, -- external ref
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null check (status in ('succeeded', 'failed', 'pending')),
  created_at timestamptz default now()
);


CREATE TABLE IF NOT EXISTS user_photos (
    id bigserial primary key,
    user_id uuid references user_profiles(user_id) on delete cascade,
    photo_url text not null,
    is_primary boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
);




-- =============== NOTIFICATIONS ===============

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text NOT NULL CHECK (type IN ('meetup', 'event', 'friend_request', 'message', 'system', 'trip', 'nearby_meetup', 'welcome_to_chat', 'meetup_heating_up')),
    data jsonb, -- Store additional data like meetup_id, event_id, etc.
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


create table public.push_notifications_queue (
    id bigint generated always as identity primary key,
    activity_id uuid not null references activities(id) on delete cascade,
    created_at timestamptz default now() not null,
    processed boolean default false not null,
    payload jsonb, -- optional: store extra data to avoid extra joins
    error_message text -- optional: store errors from push send attempt
);

create table bots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  description text,
  ai_enabled boolean default false,
  created_at timestamptz default timezone('utc', now())
);

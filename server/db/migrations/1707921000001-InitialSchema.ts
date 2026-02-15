import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1707921000001 implements MigrationInterface {
  name = 'InitialSchema1707921000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions if they don't exist
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis";`);

    // Execute the SQL from tables.sql
    await queryRunner.query(`
       
          
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
            -- 2. USERS & PROFILES & Subscriptions
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
                occupation text,
                instagram_handle text,
                linkedin_handle text,
                referral_source text,
                referral_source_other text,
                latitude double precision,
                longitude double precision,
                geo_location geography(POINT, 4326) GENERATED ALWAYS AS (
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                ) STORED,
                mobile_number text,
                gender text,
                role text DEFAULT 'user' CHECK (role IN ('user','admin','moderator','co-founder')),
                status text DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
                auth_provider text NOT NULL DEFAULT 'email',
                is_founder boolean DEFAULT false,
                is_bot boolean DEFAULT false,
                verification_photo_url text,
                last_active_at timestamptz,
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

            CREATE TABLE IF NOT EXISTS plans (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                name text NOT NULL,
                price_cents integer NOT NULL,
                currency text NOT NULL DEFAULT 'USD',
                interval text NOT NULL CHECK (interval IN ('week','month','3_months')),
                description text,
                paystack_plan_code text,
                created_at timestamptz DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
                plan_id uuid NOT NULL REFERENCES plans(id),
                status text NOT NULL CHECK (
                    status IN ('active','past_due','canceled','trialing','non_renewing')
                ),
                start_date timestamptz NOT NULL DEFAULT now(),
                provider_subscription_code text,
                provider_plan_code text,
                provider_email_token text,
                end_date timestamptz,
                cancel_at timestamptz,
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now(),
                CONSTRAINT unique_user_subscription UNIQUE (user_id)
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
                intent activity_intent,
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
                time_window tstzrange,
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
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id uuid REFERENCES user_profiles(user_id) ON DELETE CASCADE,
                country_code text NOT NULL,
                country_name text NOT NULL,
                year_visited integer,
                created_at timestamptz DEFAULT now(),
                UNIQUE(user_id, country_code)
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

            CREATE TABLE IF NOT EXISTS future_trips (
                id uuid default gen_random_uuid() primary key,
                user_id uuid references user_profiles(user_id) on delete cascade,
                city_id uuid references cities(id),
                start_date date,
                end_date date,
                created_at timestamp with time zone default timezone('utc'::text, now())
            );

            CREATE TABLE IF NOT EXISTS chat_unread_counts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL references user_profiles(user_id) on delete cascade,
                chat_type TEXT NOT NULL CHECK (
                    chat_type IN ('direct', 'meetup', 'event', 'trip', 'blend')
                ),
                chat_id UUID NOT NULL,
                last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

                UNIQUE(user_id, chat_id)
            );

            CREATE TABLE IF NOT EXISTS payments (
                id uuid primary key default gen_random_uuid(),
                subscription_id uuid references subscriptions(id) on delete cascade,
                provider text not null,
                provider_payment_id text not null,
                amount_cents integer not null,
                currency text not null default 'USD',
                status text not null check (status in ('succeeded', 'failed', 'pending')),
                created_at timestamptz default now()
            );

            create table if not exists user_devices (
                id uuid primary key default gen_random_uuid(),
                user_id uuid references user_profiles(user_id) on delete cascade,
                device_id text not null,
                platform text not null check (platform in ('android', 'ios', 'web')),
                last_seen timestamptz,
                app_version text,
                created_at timestamptz default now(),
                unique (user_id, device_id)
            );


            create table if not exists clients (
                id uuid primary key default uuid_generate_v4(),
                name text not null,
                type text check (
                    type in (
                    'bar',
                    'restaurant',
                    'cafe',
                    'gym',
                    'market',
                    'social',
                    'volunteering'
                    )
                ),
                description text,
                logo_url text,
                image_url text [],
                google_maps_link text,
                latitude numeric(10, 6) not null,
                longitude numeric(10, 6) not null,
                geo_location geography(POINT, 4326) GENERATED ALWAYS AS (
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                ) STORED,
                address text,
                website_url text,
                instagram_url text,
                contact_number text,
                email text,
                rating numeric(2, 1) default 0,
                created_at timestamp with time zone default now(),
                updated_at timestamp with time zone default now()
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order of creation to avoid foreign key constraints
    await queryRunner.query(`
            DROP TABLE IF EXISTS user_references;
            DROP TABLE IF EXISTS profile_views;
            DROP TABLE IF EXISTS local_ambassadors;
            DROP TABLE IF EXISTS boosts;
            DROP TABLE IF EXISTS user_activity_views;
            DROP TABLE IF EXISTS user_countries;
            DROP TABLE IF EXISTS notifications;
            DROP TABLE IF EXISTS message_reactions;
            DROP TABLE IF EXISTS participants;
            DROP TABLE IF EXISTS user_reports;
            DROP TABLE IF EXISTS friends;
            DROP TABLE IF EXISTS friend_requests;
            DROP TABLE IF EXISTS messages;
            DROP TABLE IF EXISTS chats;
            DROP TABLE IF EXISTS cities;
            DROP TABLE IF EXISTS activities;
            DROP TABLE IF EXISTS user_blocks;
            DROP TABLE IF EXISTS user_push_tokens;
            DROP TABLE IF EXISTS user_photos;
            DROP TABLE IF EXISTS user_interests;
            DROP TABLE IF EXISTS interests;
            DROP TABLE IF EXISTS user_languages;
            DROP TABLE IF EXISTS languages;
            DROP TABLE IF EXISTS user_preferences;
            DROP TABLE IF EXISTS user_profiles;
            DROP TABLE IF EXISTS bots;
            DROP TABLE IF EXISTS system_users;
        `);
  }
}

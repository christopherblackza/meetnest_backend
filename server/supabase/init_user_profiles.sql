-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles ( 
   user_id uuid primary key references auth.users(id) on delete cascade, 
   display_name text, 
   full_name text, 
   email text unique, 
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
   role text default 'user' check ( 
     role in ('user', 'admin', 'moderator', 'co-founder') 
   ), 
   status text default 'active' check (status in ('active', 'suspended', 'banned')), 
   auth_provider text not null default 'email', 
   is_founder boolean default false, 
   is_bot boolean default false, 
   verification_photo_url text, 
   geo_location geography(POINT, 4326) GENERATED ALWAYS AS ( 
     ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
   ) STORED, 
   trust_score integer default 100 check ( 
     trust_score >= 0 
     and trust_score <= 100 
   ),
   created_at timestamp with time zone default timezone('utc'::text, now()),
   
   CONSTRAINT referral_source_check CHECK ( 
     referral_source IN ( 
       'google', 
       'instagram', 
       'tiktok', 
       'youtube', 
       'facebook', 
       'twitter', 
       'friend_family', 
       'app_store', 
       'other' 
     ) 
   ), 
   -- Only require custom text when "other" is selected 
   CONSTRAINT referral_source_other_check CHECK ( 
     referral_source <> 'other' 
     OR referral_source_other IS NOT NULL 
   ) 
 ); 
 
 -- Indexes
 CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id); 
 CREATE INDEX IF NOT EXISTS idx_user_profiles_lat_lon ON user_profiles(latitude, longitude); 
 
 -- User profile queries optimization 
 CREATE INDEX IF NOT EXISTS idx_user_profiles_search ON user_profiles(user_id) INCLUDE ( 
   display_name, 
   full_name, 
   avatar_url, 
   date_of_birth, 
   gender, 
   country_of_origin 
 ); 
 
 CREATE INDEX IF NOT EXISTS idx_user_profiles_name_search ON user_profiles USING gin( 
   to_tsvector( 
     'english', 
     COALESCE(display_name, '') || ' ' || COALESCE(full_name, '') 
   ) 
 );

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFunctions1707921000003 implements MigrationInterface {
  name = 'AddFunctions1707921000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
create or replace function public.register_user(
    _user_id uuid,
    _display_name text,
    _full_name text,
    _email text,
    _date_of_birth date,
    _avatar_url text,
    _country_of_origin text,
    _mobile_number text,
    _instagram_handle text,
    _linkedin_handle text,
    _gender text,
    _bio text,
    _auth_provider text default 'email',
    _interests bigint [] default '{}',
    _latitude double precision default null,
    _longitude double precision default null
  ) returns jsonb language plpgsql as $$
declare _plan_id uuid;
_is_early_access boolean;
begin -- Insert or update the user profile
insert into user_profiles (
    user_id,
    display_name,
    full_name,
    email,
    date_of_birth,
    avatar_url,
    country_of_origin,
    mobile_number,
    instagram_handle,
    linkedin_handle,
    gender,
    bio,
    auth_provider,
    created_at,
    latitude,
    longitude
  )
values (
    _user_id,
    _display_name,
    _full_name,
    _email,
    _date_of_birth,
    _avatar_url,
    _country_of_origin,
    _mobile_number,
    _instagram_handle,
    _linkedin_handle,
    _gender,
    _bio,
    _auth_provider,
    timezone('utc', now()),
    _latitude,
    _longitude
  ) on conflict (user_id) do
update
set display_name = excluded.display_name,
  full_name = excluded.full_name,
  date_of_birth = excluded.date_of_birth,
  avatar_url = excluded.avatar_url,
  country_of_origin = excluded.country_of_origin,
  mobile_number = excluded.mobile_number,
  instagram_handle = excluded.instagram_handle,
  linkedin_handle = excluded.linkedin_handle,
  gender = excluded.gender,
  bio = excluded.bio,
  latitude = excluded.latitude,
  longitude = excluded.longitude;
-- Insert user interests if provided
if array_length(_interests, 1) is not null then
delete from user_interests
where user_id = _user_id;
insert into user_interests (user_id, interest_id)
select _user_id,
  unnest(_interests);
end if;

-- Update the early access_access table is_claimed to true and claimed_at to now
update early_access_signups
set is_claimed = true,
  claimed_at = now()
where email = _email;
-- Insert subscription (only if user doesn't already have one active)
insert into subscriptions (user_id, plan_id, status, start_date)
values (_user_id, _plan_id, 'active', now()) on conflict (user_id)
where subscriptions.status = 'active' do nothing;
-- Insert default preferences
insert into user_preferences (user_id)
values (_user_id) on conflict (user_id) do nothing;
-- Return success JSON with plan info
return jsonb_build_object(
  'status',
  'success',
  'message',
  'User registered successfully',
  'user',
  jsonb_build_object(
    'user_id',
    _user_id,
    'display_name',
    _display_name,
    'email',
    _email,
    'subscription_plan',
    case
      when _is_early_access then 'Pro'
      else 'Free'
    end,
    'currency',
    'ZAR',
    'is_early_access',
    _is_early_access
  )
);
exception
when others then return jsonb_build_object(
  'status',
  'error',
  'message',
  'Registration failed: ' || sqlerrm
);
end;
$$;


create or replace function public.is_user_profile_complete(uid uuid) returns boolean language sql stable security definer as $$
select exists (
    select 1
    from user_profiles up
    where up.user_id = uid
      and up.display_name is not null
      and up.full_name is not null
      and up.email is not null
      and up.date_of_birth is not null
      and up.country_of_origin is not null
      and up.gender is not null
      and up.avatar_url is not null
  );
$$;


create or replace function public.get_user_profile(
    uid uuid,
    current_user_id uuid default null
  ) returns table (
    user_id uuid,
    display_name text,
    full_name text,
    email text,
    bio text,
    date_of_birth text,
    occupation text,
    country_of_origin text,
    current_city text,
    current_country text,
    avatar_url text,
    instagram_handle text,
    linkedin_handle text,
    role text,
    auth_provider text,
    created_at timestamptz,
    gender text,
    interests text [],
    languages text [],
    photo_urls text [],
    relationship_status text,
    subscription_plan text,
    subscription_status text,
    subscription_cancel_at timestamptz,
    is_paid boolean,
    is_founder boolean,
    is_ambassador boolean,
    trust_score integer,
    provider_subscription_code text,
    provider_email_token text,
    countries jsonb,
    future_trips jsonb
  ) language sql stable security definer as $$
select up.user_id,
  up.display_name,
  up.full_name,
  up.email,
  up.bio,
  case
    when current_user_id = uid then up.date_of_birth -- 👈 own profile: always show
    when coalesce(up2.show_age, false) then up.date_of_birth -- 👈 other profiles: only if show_age is true
    else null
  end as date_of_birth,
  up.occupation,
  up.country_of_origin,
  up.current_city,
  up.current_country,
  up.avatar_url,
  up.instagram_handle,
  up.linkedin_handle,
  up.role,
  up.auth_provider,
  up.created_at,
  up.gender,
  array_agg(distinct i.id) filter (
    where i.id is not null
  ) as interests,
  array_agg(distinct l.code) filter (
    where l.code is not null
  ) as languages,
  array_agg(distinct p.photo_url) filter (
    where p.id is not null
  ) as photo_urls,
  CASE
    WHEN current_user_id IS NULL
    OR current_user_id = uid THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM friends f
      WHERE f.user_id = current_user_id
        AND f.friend_id = uid
    ) THEN 'friends'
    WHEN EXISTS (
      SELECT 1
      FROM friend_requests fr
      WHERE fr.sender_id = current_user_id
        AND fr.receiver_id = uid
    ) THEN 'request_sent'
    WHEN EXISTS (
      SELECT 1
      FROM friend_requests fr
      WHERE fr.sender_id = uid
        AND fr.receiver_id = current_user_id
    ) THEN 'request_received'
    ELSE 'none'
  END as relationship_status,
  COALESCE(pl.name, 'Free') as subscription_plan,
  COALESCE(s.status, 'inactive') as subscription_status,
  s.cancel_at as subscription_cancel_at,
  (
    pl.price_cents > 0
    AND s.status = 'active'
    AND (
      s.cancel_at IS NULL
      OR s.cancel_at > now()
    )
  ) as is_paid,
  up.is_founder,
  (
    SELECT EXISTS (
        SELECT 1
        FROM local_ambassadors la
        WHERE la.user_id = up.user_id
          AND la.country = up.country_of_origin
          AND la.status = 'active'
      )
  ) as is_ambassador,
  up.trust_score,
  s.provider_subscription_code,
  s.provider_email_token,
  (
    select jsonb_agg(
        jsonb_build_object(
          'country_code', uc.country_code,
          'country_name', uc.country_name,
          'year_visited', uc.year_visited
        ) ORDER BY uc.year_visited DESC NULLS LAST, uc.country_name ASC
      )
    from user_countries uc
    where uc.user_id = uid
  ) as countries,
  (
    select jsonb_agg(
        jsonb_build_object(
          'trip_id',
          ft.id,
          'user_id',
          ft.user_id,
          'city_id',
          c.id,
          'city_name',
          c.name,
          'country',
          c.country,
          'start_date',
          ft.start_date,
          'end_date',
          ft.end_date,
          'created_at',
          ft.created_at
        )
      )
    from future_trips ft
      join cities c on ft.city_id = c.id
    where ft.user_id = uid
      and ft.end_date >= current_date
      and (
        uid = current_user_id
        or exists (
          select 1
          from friends f
          where (
              f.user_id = uid
              and f.friend_id = current_user_id
            )
            or (
              f.user_id = current_user_id
              and f.friend_id = uid
            )
        )
      )
  ) as future_trips
from user_profiles up
  left join user_preferences up2 on up.user_id = up2.user_id
  left join user_interests ui on up.user_id = ui.user_id
  left join interests i on ui.interest_id = i.id
  left join user_languages ul on up.user_id = ul.user_id
  left join languages l on ul.language_code = l.code
  left join user_photos p on up.user_id = p.user_id
  left join subscriptions s on s.user_id = up.user_id
  left join plans pl on pl.id = s.plan_id
where up.user_id = uid
group by up.user_id,
  up.display_name,
  up.full_name,
  up.email,
  up.bio,
  up2.show_age,
  up.occupation,
  up.country_of_origin,
  up.current_city,
  up.current_country,
  up.avatar_url,
  up.instagram_handle,
  up.linkedin_handle,
  up.role,
  up.auth_provider,
  up.created_at,
  up.gender,
  pl.name,
  s.status,
  s.cancel_at,
  pl.price_cents,
  up.is_founder,
  up.trust_score,
  s.provider_subscription_code,
  s.provider_email_token,
  current_user_id;
$$;


create or replace function public.update_user_preferences(
    uid uuid,
    p_notifications_enabled boolean default null,
    p_show_location boolean default null,
    p_allow_messages boolean default null,
    p_show_age boolean default null,
    p_hide_nearby_distance boolean default null
  ) returns void as $$ begin -- Insert or update user preferences
insert into user_preferences (
    user_id,
    notifications_enabled,
    show_location,
    allow_messages,
    show_age,
    hide_nearby_distance
  )
values (
    uid,
    coalesce(p_notifications_enabled, true),
    coalesce(p_show_location, true),
    coalesce(p_allow_messages, true),
    coalesce(p_show_age, false),
    coalesce(p_hide_nearby_distance, false)
  ) on conflict (user_id) do
update
set notifications_enabled = coalesce(
    p_notifications_enabled,
    user_preferences.notifications_enabled
  ),
  show_location = coalesce(p_show_location, user_preferences.show_location),
  allow_messages = coalesce(
    p_allow_messages,
    user_preferences.allow_messages
  ),
  show_age = coalesce(p_show_age, user_preferences.show_age),
  hide_nearby_distance = coalesce(
    p_hide_nearby_distance,
    user_preferences.hide_nearby_distance
  );
end;
$$ language plpgsql security definer;


create or replace function public.get_clients_in_bounds(
    min_lat double precision,
    min_lng double precision,
    max_lat double precision,
    max_lng double precision,
    limit_count int default 100
  ) returns table (
    id uuid,
    name text,
    latitude double precision,
    longitude double precision,
    logo_url text,
    type text,
    description text,
    image_url text [],
    address text,
    website_url text,
    instagram_url text,
    contact_number text,
    email text,
    google_maps_link text,
    rating double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
  ) language sql stable security definer as $$
select id,
  name,
  latitude,
  longitude,
  logo_url,
  type,
  description,
  image_url,
  address,
  website_url,
  instagram_url,
  contact_number,
  email,
  google_maps_link,
  rating,
  created_at,
  updated_at
from clients
where latitude >= min_lat
  and latitude <= max_lat
  and longitude >= min_lng
  and longitude <= max_lng
limit limit_count;
$$;


create or replace function public.get_user_preferences(uid uuid) returns table (
    user_id uuid,
    notifications_enabled boolean,
    show_location boolean,
    allow_messages boolean,
    show_age boolean,
    language text,
    hide_nearby_distance boolean
  ) as $$ begin return query
select up.user_id,
  coalesce(up.notifications_enabled, true) as notifications_enabled,
  coalesce(up.show_location, true) as show_location,
  coalesce(up.allow_messages, true) as allow_messages,
  coalesce(up.show_age, false) as show_age,
  coalesce(up.language, 'en') as language,
  coalesce(up.hide_nearby_distance, false) as hide_nearby_distance
from user_preferences up
where up.user_id = uid;
end;
$$ language plpgsql security definer;


create or replace function public.update_user_profile(
    current_user_id uuid,
    new_display_name text,
    new_bio text,
    new_instagram_handle text,
    new_linkedin_handle text,
    new_interest_ids bigint [],
    new_location text,
    new_country_of_origin text default null,
    new_language_codes text [] default null,
    new_countries jsonb default null
  ) returns void as $$ begin -- 1️⃣ Update main user_profiles fields
update user_profiles
set display_name = new_display_name,
  bio = new_bio,
  instagram_handle = new_instagram_handle,
  linkedin_handle = new_linkedin_handle,
  location = new_location,
  country_of_origin = new_country_of_origin
where user_id = current_user_id;
-- 2️⃣ Replace interests by IDs
delete from user_interests
where user_id = current_user_id;
insert into user_interests (user_id, interest_id)
select current_user_id,
  unnest(new_interest_ids);
-- 3️⃣ Replace languages by codes (if provided)
if new_language_codes is not null then
delete from user_languages
where user_id = current_user_id;
insert into user_languages (user_id, language_code)
select current_user_id,
  unnest(new_language_codes);
end if;
-- 4️⃣ Replace countries (if provided)
if new_countries is not null then
delete from user_countries
where user_id = current_user_id;
insert into user_countries (user_id, country_code, country_name, year_visited)
select current_user_id,
  x->>'country_code',
  x->>'country_name',
  (x->>'year_visited')::int
from jsonb_array_elements(new_countries) as x;
end if;
end;
$$ language plpgsql security definer;



create or replace function public.is_admin(user_id uuid) returns boolean language sql security definer stable as $$
select exists (
    select 1
    from user_profiles
    where user_id = $1
      and role = 'admin'
  );
$$;



CREATE OR REPLACE FUNCTION calculate_user_trust_score(target_user_id UUID) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE report_count INTEGER;
unique_reporters INTEGER;
new_trust_score INTEGER;
base_score INTEGER := 100;
BEGIN -- Count total reports for this user
SELECT COUNT(*) INTO report_count
FROM user_reports
WHERE reported_id = target_user_id
  AND status IN ('pending', 'action_taken');
-- Count unique reporters (to prevent spam from same user)
SELECT COUNT(DISTINCT reporter_id) INTO unique_reporters
FROM user_reports
WHERE reported_id = target_user_id
  AND status IN ('pending', 'action_taken');
-- Calculate trust score based on unique reporters
-- Each unique reporter reduces score by 10 points
-- Additional reports from same user reduce by 2 points each
new_trust_score := base_score - (unique_reporters * 10) - ((report_count - unique_reporters) * 2);
-- Ensure score doesn't go below 0
new_trust_score := GREATEST(new_trust_score, 0);
-- Update the user's trust score
UPDATE user_profiles
SET trust_score = new_trust_score
WHERE user_id = target_user_id;
RETURN new_trust_score;
END;
$$;


CREATE OR REPLACE FUNCTION create_message(
    p_chat_id uuid,
    p_user_id uuid,
    p_message text,
    p_image_url text DEFAULT NULL,
    p_message_type text DEFAULT 'text'
  ) RETURNS TABLE (
    msg_id uuid,
    chat_id uuid,
    user_id uuid,
    message text,
    image_url text,
    created_at timestamptz,
    display_name text,
    avatar_url text,
    message_type text
  ) LANGUAGE plpgsql AS $$
DECLARE new_msg_id uuid;
BEGIN
INSERT INTO messages (
    chat_id,
    user_id,
    message,
    image_url,
    message_type,
    created_at
  )
VALUES (
    p_chat_id,
    p_user_id,
    p_message,
    p_image_url,
    p_message_type,
    timezone('utc', now())
  )
RETURNING id INTO new_msg_id;
RETURN QUERY
SELECT m.id,
  m.chat_id,
  m.user_id,
  m.message,
  m.image_url,
  m.created_at,
  u.display_name,
  u.avatar_url,
  m.message_type
FROM messages m
  JOIN user_profiles u ON u.user_id = m.user_id
WHERE m.id = new_msg_id;
END;
$$;


CREATE OR REPLACE FUNCTION get_chat_screen(p_chat_id uuid, p_user_id uuid) RETURNS json AS $$
DECLARE result json;
BEGIN
SELECT json_build_object(
    'chat_id',
    c.id,
    'chat_type',
    c.chat_type,
    'chat_title',
    CASE
      WHEN c.is_system_chat = true THEN su_chat.display_name
      WHEN c.chat_type = 'meetup' THEN a.title
      WHEN c.chat_type = 'event' THEN a.title
      WHEN c.chat_type = 'direct' THEN up.display_name
      WHEN c.chat_type = 'blend' THEN a.title
      ELSE 'Unknown Chat'
    END,
    'expires_at',
    CASE
      WHEN c.chat_type = 'meetup' THEN a.expires_at
      WHEN c.chat_type = 'event' THEN a.end_date_time
      ELSE NULL
    END,
    'participants_count',
    (
      SELECT COUNT(*)
      FROM participants p
        JOIN user_profiles up ON p.user_id = up.user_id
      WHERE p.chat_id = c.id
        AND up.is_bot = false
        AND up.user_id != p_user_id
    ),
    'messages',
    COALESCE(
      (
        SELECT json_agg(
            json_build_object(
              'id',
              msg.id,
              'user_id',
              COALESCE(msg.user_id, msg.system_user_id, msg.bot_id),
              'message',
              msg.message,
              'created_at',
              msg.created_at,
              'display_name',
              COALESCE(up2.display_name, su_msg.display_name, b.name),
              'avatar_url',
              COALESCE(up2.avatar_url, su_msg.avatar_url, b.avatar_url),
              'is_system_message',
              (
                msg.system_user_id IS NOT NULL
                OR msg.bot_id IS NOT NULL
              )
            )
            ORDER BY msg.created_at
          )
        FROM messages msg
          LEFT JOIN user_profiles up2 ON up2.user_id = msg.user_id
          LEFT JOIN system_users su_msg ON su_msg.system_user_id = msg.system_user_id
          LEFT JOIN bots b ON b.id = msg.bot_id
        WHERE msg.chat_id = c.id
      ),
      '[]'::json
    ),
    'direct_participant_id',
    (
      CASE
        WHEN c.chat_type = 'direct' THEN (
          SELECT p2.user_id
          FROM participants p2
          WHERE p2.chat_id = c.id
            AND p2.user_id != p_user_id
          LIMIT 1
        )
        ELSE NULL
      END
    )
  ) INTO result
FROM chats c
  LEFT JOIN activities a ON c.activity_id = a.id
  LEFT JOIN cities ON c.trip_id = cities.id
  LEFT JOIN system_users su_chat ON c.system_user_id = su_chat.system_user_id
  LEFT JOIN user_profiles up ON (
    c.chat_type = 'direct'
    AND up.user_id = (
      SELECT p2.user_id
      FROM participants p2
      WHERE p2.chat_id = c.id
      LIMIT 1
    )
  )
WHERE c.id = p_chat_id
  AND EXISTS (
    SELECT 1
    FROM participants p
    WHERE p.chat_id = c.id
      AND p.user_id = p_user_id
  )
LIMIT 1;
RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;


CREATE OR REPLACE FUNCTION get_chat(p_chat_id uuid, p_user_id uuid) RETURNS json AS $$
DECLARE result json;
BEGIN
SELECT json_build_object(
    'chat_id',
    c.id,
    'chat_type',
    c.chat_type,
    'chat_title',
    CASE
      WHEN c.chat_type = 'trip' THEN cities.name
      WHEN c.chat_type = 'meetup' THEN a.title
      WHEN c.chat_type = 'event' THEN a.title
      WHEN c.chat_type = 'direct' THEN up.display_name
      WHEN c.chat_type = 'blend' THEN a.title
      ELSE 'Unknown Chat'
    END,
    'expires_at',
    CASE
      WHEN c.chat_type = 'meetup' THEN a.expires_at
      WHEN c.chat_type = 'event' THEN a.end_date_time
      ELSE NULL
    END,
    'participants_count',
    (
      SELECT COUNT(*)
      FROM participants p
        JOIN user_profiles up3 ON p.user_id = up3.user_id
      WHERE p.chat_id = c.id
        AND up3.is_bot = false
    ),
    'messages',
    COALESCE(
      (
        SELECT json_agg(
            json_build_object(
              'id',
              msg.id,
              'user_id',
              msg.user_id,
              'message',
              msg.message,
              'created_at',
              msg.created_at,
              'display_name',
              up2.display_name,
              'avatar_url',
              up2.avatar_url
            )
            ORDER BY msg.created_at
          )
        FROM messages msg
          JOIN user_profiles up2 ON up2.user_id = msg.user_id
        WHERE msg.chat_id = c.id
      ),
      '[]'::json
    ),
    'direct_participant_id',
    (
      CASE
        WHEN c.chat_type = 'direct' THEN (
          SELECT p2.user_id
          FROM participants p2
          WHERE p2.chat_id = c.id
            AND p2.user_id != p_user_id
          LIMIT 1
        )
        ELSE NULL
      END
    )
  ) INTO result
FROM chats c
  LEFT JOIN activities a ON c.activity_id = a.id
  LEFT JOIN cities ON c.trip_id = cities.id
  LEFT JOIN user_profiles up ON (
    c.chat_type = 'direct'
    AND up.user_id = (
      SELECT p2.user_id
      FROM participants p2
      WHERE p2.chat_id = c.id
      LIMIT 1
    )
  )
WHERE c.id = p_chat_id
  AND EXISTS (
    SELECT 1
    FROM participants p
    WHERE p.chat_id = c.id
  )
LIMIT 1;
RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;


create or replace function public.update_user_location(
    p_user_id uuid,
    p_latitude double precision,
    p_longitude double precision,
    p_geo_location jsonb DEFAULT NULL,
    p_current_country text DEFAULT NULL
  ) returns void as $$ begin
update public.user_profiles
set latitude = p_latitude,
  longitude = p_longitude,
  current_country = COALESCE(p_current_country, current_country),
  location = COALESCE(p_geo_location->>'city', location)
where user_id = p_user_id;
end;
$$ language plpgsql security definer;


create or replace function public.send_friend_request(sender uuid, receiver uuid) returns void as $$ begin if sender = receiver then raise exception 'Cannot send request to self';
end if;
insert into friend_requests (sender_id, receiver_id)
values (sender, receiver) on conflict do nothing;
end;
$$ language plpgsql security definer;


create or replace function public.cancel_friend_request(sender uuid, receiver uuid) returns void as $$ begin -- Delete the pending friend request sent by the sender
delete from friend_requests
where sender_id = sender
  and receiver_id = receiver;
end;
$$ language plpgsql security definer;


create or replace function public.accept_friend_request(sender uuid, receiver uuid) returns void language plpgsql security definer as $$
declare supabase_url text;
api_key text;
begin -- Delete pending request
delete from friend_requests
where sender_id = sender
  and receiver_id = receiver;
-- Insert both directions in friends
insert into friends (user_id, friend_id)
values (sender, receiver),
  (receiver, sender) on conflict do nothing;
-- Get secrets
select value into supabase_url
from secrets
where key = 'supabase_url';
select value into api_key
from secrets
where key = 'service_role_key';
-- Call the edge function to send notification
if supabase_url is not null
and api_key is not null then perform net.http_post(
  url := supabase_url || '/functions/v1/notify-friend-accepted',
  headers := jsonb_build_object(
    'Content-Type',
    'application/json',
    'Authorization',
    'Bearer ' || api_key
  ),
  body := jsonb_build_object(
    'sender_id',
    sender,
    'receiver_id',
    receiver
  )
);
end if;
end;
$$;


create or replace function public.decline_friend_request(sender uuid, receiver uuid) returns void as $$ begin
delete from friend_requests
where sender_id = sender
  and receiver_id = receiver;
end;
$$ language plpgsql security definer;


create or replace function public.unfriend(user1 uuid, user2 uuid) returns void as $$ begin
delete from friends
where (
    user_id = user1
    and friend_id = user2
  )
  or (
    user_id = user2
    and friend_id = user1
  );
end;
$$ language plpgsql security definer;


create or replace function public.search_users_by_name(query text, current_user_id uuid) returns table (
    user_id uuid,
    full_name text,
    display_name text,
    avatar_url text,
    country_of_origin text,
    interests text [],
    shared_interest_emoticons text []
  ) as $$ begin return query with current_user_interests as (
    select distinct icm.category_id,
      ic.emoticon
    from user_interests ui
      join interest_category_map icm on ui.interest_id = icm.interest_id
      join interest_categories ic on icm.category_id = ic.id
    where ui.user_id = current_user_id
  ),
  user_shared_interests as (
    select up.user_id,
      array_agg(distinct cui.emoticon) as shared_emoticons
    from user_profiles up
      join user_interests ui on up.user_id = ui.user_id
      join interest_category_map icm on ui.interest_id = icm.interest_id
      join current_user_interests cui on icm.category_id = cui.category_id
    where up.user_id != current_user_id
    group by up.user_id
  )
select up.user_id,
  up.full_name,
  up.display_name,
  up.avatar_url,
  up.country_of_origin,
  array_agg(distinct i.name) filter (
    where i.name is not null
  ) as interests,
  coalesce(usi.shared_emoticons, array []::text []) as shared_interest_emoticons
from public.user_profiles up
  left join user_interests ui on up.user_id = ui.user_id
  left join interests i on ui.interest_id = i.id
  left join user_shared_interests usi on up.user_id = usi.user_id
where (
    up.full_name ilike '%' || query || '%'
    or up.display_name ilike '%' || query || '%'
  )
  and up.user_id != current_user_id
group by up.user_id,
  up.full_name,
  up.display_name,
  up.avatar_url,
  up.country_of_origin,
  usi.shared_emoticons
limit 20;
end;
$$ language plpgsql security definer;


CREATE OR REPLACE FUNCTION public.join_chat(
    p_user_id uuid,
    p_meetup_id uuid DEFAULT NULL,
    p_event_id uuid DEFAULT NULL,
    p_trip_id uuid DEFAULT NULL
  ) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_chat_id uuid;
v_chat_type text;
v_activity_id uuid;
BEGIN -- Ensure exactly one context is passed
IF (
  (p_meetup_id IS NOT NULL)::int + (p_event_id IS NOT NULL)::int + (p_trip_id IS NOT NULL)::int
) <> 1 THEN RAISE EXCEPTION 'Exactly one of meetup_id, event_id, or trip_id must be provided';
END IF;

-- Determine chat_type and activity_id
IF p_meetup_id IS NOT NULL THEN 
    v_chat_type := 'meetup';
    v_activity_id := p_meetup_id;
ELSIF p_event_id IS NOT NULL THEN 
    v_chat_type := 'event';
    v_activity_id := p_event_id;
ELSIF p_trip_id IS NOT NULL THEN 
    v_chat_type := 'trip';
END IF;

-- Check if user is trying to join a female-only meetup (now activity)
IF v_activity_id IS NOT NULL THEN IF EXISTS (
  SELECT 1
  FROM activities a
    JOIN user_profiles up ON up.user_id = p_user_id
  WHERE a.id = v_activity_id
    AND a.female_only = true
    AND up.gender = 'Male'
    OR up.gender = ''
) THEN RAISE EXCEPTION 'Sorry, this activity is only for women';
END IF;
END IF;

-- Check if chat already exists
SELECT id INTO v_chat_id
FROM chats
WHERE (
    v_activity_id IS NOT NULL
    AND activity_id = v_activity_id
  )
  OR (
    p_trip_id IS NOT NULL
    AND trip_id = p_trip_id
  )
LIMIT 1;

-- If not found, create new chat row
IF v_chat_id IS NULL THEN
INSERT INTO chats (
    chat_type,
    activity_id,
    trip_id,
    created_at
  )
VALUES (
    v_chat_type,
    v_activity_id,
    p_trip_id,
    timezone('utc', now())
  )
RETURNING id INTO v_chat_id;
END IF;

RETURN v_chat_id;
END;
$$;


create or replace function notify_new_friend_request() returns trigger as $$
declare prefs record;
begin -- Check receiver's preferences
select notifications_enabled into prefs
from user_preferences
where user_id = new.receiver_id;
-- If preferences row exists and notifications are enabled, call edge function
if prefs.notifications_enabled is true then perform net.http_post(
  url := 'https://kwlrkrjraajnkrlgcjao.supabase.co/functions/v1/notify-friend-request',
  headers := jsonb_build_object(
    'Content-Type',
    'application/json',
    'Authorization',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bHJrcmpyYWFqbmtybGdjamFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzNTI0MSwiZXhwIjoyMDY3OTExMjQxfQ.rV0FMK9U6klkFnb-ugSeiD_LF755AFEbCeJuNIx338k'
  ),
  body := jsonb_build_object('record', row_to_json(new))
);
insert into debug_logs (message, created_at)
values (
    format(
      'Sent push notification for friend request from %s to %s',
      new.sender_id,
      new.receiver_id
    ),
    now()
  );
else
insert into debug_logs (message, created_at)
values (
    format(
      'Skipping push notification for user %s because notifications are disabled',
      new.receiver_id
    ),
    now()
  );
end if;
return new;
end;
$$ language plpgsql security definer;


CREATE OR REPLACE FUNCTION get_chat_unread_count(
    p_user_id UUID,
    p_chat_id UUID,
    p_chat_type TEXT
  ) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE last_read TIMESTAMP WITH TIME ZONE;
unread_count INTEGER := 0;
v_system_user_id UUID;
BEGIN -- Verify user is a participant in this chat
IF NOT EXISTS (
  SELECT 1
  FROM participants p
  WHERE p.chat_id = p_chat_id
    AND p.user_id = p_user_id
) THEN RETURN 0;
END IF;

-- Get chat system user id
SELECT system_user_id INTO v_system_user_id FROM chats WHERE id = p_chat_id;

-- Get last read timestamp for this user and chat
SELECT cuc.last_read_at INTO last_read
FROM chat_unread_counts cuc
WHERE cuc.user_id = p_user_id
  AND cuc.chat_id = p_chat_id;
-- If no record exists, consider all messages as unread
IF last_read IS NULL THEN last_read := '1970-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE;
END IF;
-- Count unread messages from other users
SELECT COUNT(*)::INTEGER INTO unread_count
  FROM messages m
  WHERE m.chat_id = p_chat_id
    AND m.user_id IS DISTINCT FROM p_user_id -- Don't count own messages
    AND m.created_at > last_read
    -- Don't count system messages if I am the system user
    AND (
      v_system_user_id IS DISTINCT FROM p_user_id
      OR m.system_user_id IS NULL
    );
RETURN COALESCE(unread_count, 0);
END;
$$;


CREATE OR REPLACE FUNCTION get_total_unread_count(p_user_id UUID) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_unread INTEGER := 0;
chat_record RECORD;
BEGIN -- Verify user is authenticated
-- Get all chats for the user and sum their unread counts
FOR chat_record IN (
  SELECT c.id as chat_id,
    c.chat_type
  FROM participants p
    JOIN chats c ON p.chat_id = c.id
    LEFT JOIN activities a ON c.activity_id = a.id
  WHERE p.user_id = p_user_id
    AND (
      -- 1. Activity Chats: Must not be expired
      (
        c.chat_type IN ('event', 'meetup', 'blend')
        AND a.expires_at > now()
      )
      OR
      -- 2. Trip Chats: Always visible
      (
        c.chat_type = 'trip'
      )
      OR
      -- 3. Direct Chats: Apply visibility rules
      (
        c.chat_type = 'direct'
        AND (
           -- Normal DM
           c.is_system_chat = false
           -- OR I am the recipient of system chat
           OR p_user_id <> c.system_user_id
           -- OR I am the sender (system user) AND someone replied
           OR EXISTS (
             SELECT 1 FROM messages m2
             WHERE m2.chat_id = c.id
               AND m2.user_id IS NOT NULL
           )
        )
      )
    )
) LOOP total_unread := total_unread + get_chat_unread_count(
  p_user_id,
  chat_record.chat_id,
  chat_record.chat_type
);
END LOOP;
RETURN total_unread;
END;
$$;


CREATE OR REPLACE FUNCTION mark_chat_as_read(
    p_user_id UUID,
    p_chat_id UUID,
    p_chat_type TEXT
  ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- Verify user is authenticated
  IF auth.uid() IS NULL
  OR auth.uid() != p_user_id THEN RAISE EXCEPTION 'Unauthorized';
END IF;
-- Verify user is a participant in this chat
IF NOT EXISTS (
  SELECT 1
  FROM participants p
  WHERE p.chat_id = p_chat_id
) THEN RAISE EXCEPTION 'User is not a participant in this chat';
END IF;
-- Insert or update the last_read_at timestamp
INSERT INTO chat_unread_counts (
    user_id,
    chat_id,
    chat_type,
    last_read_at,
    updated_at
  )
VALUES (
    p_user_id,
    p_chat_id,
    p_chat_type,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id, chat_id) DO
UPDATE
SET last_read_at = NOW(),
  updated_at = NOW();
END;
$$;


CREATE OR REPLACE FUNCTION public.get_user_chats(
  p_user_id uuid
)
RETURNS TABLE (
  chat_id uuid,
  chat_type text,
  activity_type text,
  title text,
  avatar_url text,
  country_code text,
  participant_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
-- =========================
-- DIRECT CHATS
-- =========================
SELECT
  c.id AS chat_id,
  c.chat_type,
  NULL::text AS activity_type,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN su.display_name
    ELSE u.display_name
  END AS title,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN su.avatar_url
    ELSE u.avatar_url
  END AS avatar_url,
  NULL::text AS country_code,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN c.system_user_id
    ELSE p_other.user_id
  END AS participant_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  get_chat_unread_count(p_user_id, c.id, c.chat_type) AS unread_count
FROM chats c
JOIN participants p_self
  ON p_self.chat_id = c.id
 AND p_self.user_id = p_user_id
LEFT JOIN participants p_other
  ON p_other.chat_id = c.id
 AND p_other.user_id <> p_user_id
LEFT JOIN user_profiles u
  ON u.user_id = p_other.user_id
LEFT JOIN system_users su
  ON su.system_user_id = c.system_user_id
LEFT JOIN chat_unread_counts cuc
  ON cuc.chat_id = c.id
 AND cuc.user_id = p_user_id
LEFT JOIN LATERAL (
  SELECT message, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE c.chat_type = 'direct'
AND (
  -- Normal user-to-user DMs
  c.is_system_chat = false

  -- Recipient of system welcome chat (always visible)
  OR p_user_id <> c.system_user_id

  -- Founder/system user: only after user replies
  OR EXISTS (
    SELECT 1
    FROM messages m2
    WHERE m2.chat_id = c.id
      AND m2.user_id IS NOT NULL
  )
)

UNION ALL

-- =========================
-- ACTIVITY-BASED CHATS
-- =========================
SELECT
  c.id AS chat_id,
  c.chat_type,
  a.type AS activity_type,
  a.title,
  u.avatar_url,
  NULL::text AS country_code,
  NULL::uuid AS participant_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  get_chat_unread_count(p_user_id, c.id, c.chat_type) AS unread_count
FROM chats c
JOIN participants p
  ON p.chat_id = c.id
 AND p.user_id = p_user_id
JOIN activities a
  ON a.id = c.activity_id
LEFT JOIN user_profiles u
  ON u.user_id = a.created_by
LEFT JOIN chat_unread_counts cuc
  ON cuc.chat_id = c.id
 AND cuc.user_id = p_user_id
LEFT JOIN LATERAL (
  SELECT message, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE c.chat_type IN ('event', 'meetup', 'blend')
  AND a.expires_at > now()

UNION ALL

-- =========================
-- TRIP CHATS
-- =========================
SELECT
  c.id AS chat_id,
  c.chat_type,
  'trip' AS activity_type,
  ci.name AS title,
  NULL::text AS avatar_url,
  ci.country_code AS country_code,
  NULL::uuid AS participant_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  get_chat_unread_count(p_user_id, c.id, c.chat_type) AS unread_count
FROM chats c
JOIN participants p
  ON p.chat_id = c.id
 AND p.user_id = p_user_id
JOIN cities ci
  ON ci.id = c.trip_id
LEFT JOIN chat_unread_counts cuc
  ON cuc.chat_id = c.id
 AND cuc.user_id = p_user_id
LEFT JOIN LATERAL (
  SELECT message, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE c.chat_type = 'trip'

ORDER BY last_message_at DESC NULLS LAST;
$$;


CREATE OR REPLACE FUNCTION public.get_user_chats_mvp(
  p_user_id uuid
)
RETURNS TABLE (
  chat_id uuid,
  chat_type text,
  activity_type text,
  title text,
  avatar_url text,
  country_code text,
  participant_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
-- =========================
-- DIRECT CHATS
-- =========================
SELECT
  c.id AS chat_id,
  c.chat_type,
  NULL::text AS activity_type,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN su.display_name
    ELSE u.display_name
  END AS title,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN su.avatar_url
    ELSE u.avatar_url
  END AS avatar_url,
  NULL::text AS country_code,
  CASE
    WHEN c.is_system_chat = true AND c.system_user_id <> p_user_id THEN c.system_user_id
    ELSE p_other.user_id
  END AS participant_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  get_chat_unread_count(p_user_id, c.id, c.chat_type) AS unread_count
FROM chats c
JOIN participants p_self
  ON p_self.chat_id = c.id
 AND p_self.user_id = p_user_id
LEFT JOIN participants p_other
  ON p_other.chat_id = c.id
 AND p_other.user_id <> p_user_id
LEFT JOIN user_profiles u
  ON u.user_id = p_other.user_id
LEFT JOIN system_users su
  ON su.system_user_id = c.system_user_id
LEFT JOIN chat_unread_counts cuc
  ON cuc.chat_id = c.id
 AND cuc.user_id = p_user_id
LEFT JOIN LATERAL (
  SELECT message, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE c.chat_type = 'direct'
AND (
  -- Normal user-to-user DMs
  c.is_system_chat = false

  -- Recipient of system welcome chat (always visible)
  OR p_user_id <> c.system_user_id

  -- Founder/system user: only after user replies
  OR EXISTS (
    SELECT 1
    FROM messages m2
    WHERE m2.chat_id = c.id
      AND m2.user_id IS NOT NULL
  )
)

UNION ALL

-- =========================
-- ACTIVITY-BASED CHATS
-- =========================
SELECT
  c.id AS chat_id,
  c.chat_type,
  a.type AS activity_type,
  a.title,
  u.avatar_url,
  NULL::text AS country_code,
  NULL::uuid AS participant_id,
  lm.message AS last_message,
  lm.created_at AS last_message_at,
  get_chat_unread_count(p_user_id, c.id, c.chat_type) AS unread_count
FROM chats c
JOIN participants p
  ON p.chat_id = c.id
 AND p.user_id = p_user_id
JOIN activities a
  ON a.id = c.activity_id
LEFT JOIN user_profiles u
  ON u.user_id = a.created_by
LEFT JOIN chat_unread_counts cuc
  ON cuc.chat_id = c.id
 AND cuc.user_id = p_user_id
LEFT JOIN LATERAL (
  SELECT message, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE c.chat_type IN ('event', 'meetup', 'blend')
  AND a.expires_at > now()


ORDER BY last_message_at DESC NULLS LAST;
$$;


CREATE OR REPLACE FUNCTION get_nearby_travellers(
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    current_user_id UUID,
    p_radius_km DOUBLE PRECISION DEFAULT 50
  ) RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    country_of_origin TEXT,
    avatar_url TEXT,
    current_city TEXT,
    current_country TEXT,
    distance_km FLOAT,
    shared_category_emoticons TEXT [],
    extra_shared_count INT,
    status_text TEXT,
    last_active_at timestamptz
  ) AS $$ WITH current_user_categories AS (
    SELECT DISTINCT icm.category_id
    FROM user_interests ui
      JOIN interest_category_map icm ON icm.interest_id = ui.interest_id
    WHERE ui.user_id = current_user_id
  ),
  shared_categories AS (
    SELECT up.user_id,
      COUNT(DISTINCT cuc.category_id) AS total_shared,
      ARRAY_AGG(DISTINCT ic.emoticon) FILTER (
        WHERE ic.emoticon IS NOT NULL
      ) AS category_emoticons
    FROM user_profiles up
      JOIN user_interests ui ON up.user_id = ui.user_id
      JOIN interest_category_map icm ON ui.interest_id = icm.interest_id
      JOIN current_user_categories cuc ON icm.category_id = cuc.category_id
      JOIN interest_categories ic ON icm.category_id = ic.id
    WHERE up.user_id != current_user_id
    GROUP BY up.user_id
  ),
  distance_calc AS (
    SELECT up.*,
      (
        6371 * acos(
          cos(radians(p_user_lat)) * cos(radians(up.latitude)) * cos(radians(up.longitude) - radians(p_user_lng)) + sin(radians(p_user_lat)) * sin(radians(up.latitude))
        )
      ) AS calculated_distance_km
    FROM user_profiles up
  )
SELECT up.user_id,
  up.display_name,
  up.country_of_origin,
  up.avatar_url,
  up.current_city,
  up.current_country,
  CASE
    WHEN COALESCE(pref.hide_nearby_distance, FALSE) THEN NULL
    ELSE up.calculated_distance_km
  END AS distance_km,
  COALESCE(sc.category_emoticons, ARRAY []::TEXT []) AS shared_category_emoticons,
  CASE
    WHEN COALESCE(sc.total_shared, 0) > 3 THEN sc.total_shared - 3
    ELSE 0
  END AS extra_shared_count,
  CASE
    WHEN up.last_active_at > NOW() - INTERVAL '1 day' THEN 'Today'
    WHEN up.last_active_at > NOW() - INTERVAL '2 days' THEN 'Yesterday'
    WHEN up.last_active_at > NOW() - INTERVAL '7 days' THEN 'This week'
    WHEN up.last_active_at > NOW() - INTERVAL '14 days' THEN 'Recently'
    WHEN up.last_active_at > NOW() - INTERVAL '30 days' THEN 'This month'
    ELSE 'Less active'
  END AS status_text,
  up.last_active_at
FROM distance_calc up
  LEFT JOIN shared_categories sc ON up.user_id = sc.user_id
  LEFT JOIN user_preferences pref ON up.user_id = pref.user_id
WHERE up.user_id != current_user_id
  AND up.latitude IS NOT NULL
  AND up.longitude IS NOT NULL -- Hard exclude very stale accounts
  AND up.last_active_at > NOW() - INTERVAL '60 days' -- Bounding box (performance)
  AND up.latitude BETWEEN p_user_lat - (p_radius_km / 111.0) AND p_user_lat + (p_radius_km / 111.0)
  AND up.longitude BETWEEN p_user_lng - (p_radius_km / (111.0 * cos(radians(p_user_lat)))) AND p_user_lng + (p_radius_km / (111.0 * cos(radians(p_user_lat)))) -- Precise radius filter
  AND up.calculated_distance_km <= p_radius_km
ORDER BY -- Recency tiers first (feel alive)
  CASE
    WHEN up.last_active_at > NOW() - INTERVAL '1 day' THEN 1
    WHEN up.last_active_at > NOW() - INTERVAL '7 days' THEN 2
    WHEN up.last_active_at > NOW() - INTERVAL '14 days' THEN 3
    WHEN up.last_active_at > NOW() - INTERVAL '45 days' THEN 4
    ELSE 5
  END,
  up.last_active_at DESC,
  COALESCE(sc.total_shared, 0) DESC,
  up.calculated_distance_km ASC;
$$ LANGUAGE sql STABLE;


CREATE OR REPLACE FUNCTION get_nearby_users(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_creator_id uuid,
    p_radius_km DOUBLE PRECISION DEFAULT 10,
    p_check_notifications BOOLEAN DEFAULT true
  ) RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    token TEXT,
    distance_km DOUBLE PRECISION
  ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY
SELECT up.user_id,
  up.display_name,
  up.latitude,
  up.longitude,
  upt.token,
  -- Calculate distance using Haversine formula
  (
    6371 * acos(
      cos(radians(p_lat)) * cos(radians(up.latitude)) * cos(radians(up.longitude) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(up.latitude))
    )
  ) AS distance_km
FROM public.user_profiles up
  INNER JOIN public.user_push_tokens upt ON up.user_id = upt.user_id
  LEFT JOIN public.user_preferences pref ON up.user_id = pref.user_id
WHERE up.latitude IS NOT NULL
  AND up.longitude IS NOT NULL
  AND up.user_id != p_creator_id
  AND upt.token IS NOT NULL
  AND (
    p_check_notifications = false
    OR COALESCE(pref.notifications_enabled, true) = true
  ) -- Conditionally filter notifications
  -- Pre-filter with a rough bounding box for performance
  AND up.latitude BETWEEN p_lat - (p_radius_km / 111.0) AND p_lat + (p_radius_km / 111.0)
  AND up.longitude BETWEEN p_lng - (p_radius_km / (111.0 * cos(radians(p_lat)))) AND p_lng + (p_radius_km / (111.0 * cos(radians(p_lat)))) -- Calculate exact distance and filter to radius in WHERE clause instead of HAVING
  AND (
    6371 * acos(
      cos(radians(p_lat)) * cos(radians(up.latitude)) * cos(radians(up.longitude) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(up.latitude))
    )
  ) <= p_radius_km
ORDER BY distance_km;
END;
$$;


CREATE OR REPLACE FUNCTION get_fellow_travelers(p_trip_id UUID) RETURNS TABLE (
    fellow_user_id UUID,
    fellow_display_name TEXT,
    fellow_avatar_url TEXT,
    fellow_trip_id UUID,
    fellow_trip_start_date DATE,
    fellow_trip_end_date DATE,
    city_id UUID,
    city_name TEXT,
    city_display_name TEXT,
    city_country TEXT,
    overlap_start DATE,
    overlap_end DATE,
    overlap_days INTEGER,
    shared_interests TEXT [],
    shared_interest_emoticons TEXT [],
    shared_interests_count INTEGER
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_city_id UUID;
v_start_date DATE;
v_end_date DATE;
BEGIN -- Get the current user's trip details
SELECT ft.user_id,
  ft.city_id,
  ft.start_date,
  ft.end_date INTO v_user_id,
  v_city_id,
  v_start_date,
  v_end_date
FROM future_trips ft
WHERE ft.id = p_trip_id;
-- Return empty if trip not found
IF v_user_id IS NULL THEN RETURN;
END IF;
-- Find fellow travelers with overlapping trips in the same city
RETURN QUERY
SELECT DISTINCT ft2.user_id as fellow_user_id,
  up.display_name as fellow_display_name,
  up.avatar_url as fellow_avatar_url,
  ft2.id as fellow_trip_id,
  ft2.start_date as fellow_trip_start_date,
  ft2.end_date as fellow_trip_end_date,
  c.id as city_id,
  c.name as city_name,
  c.display_name as city_display_name,
  c.country as city_country,
  GREATEST(v_start_date, ft2.start_date) as overlap_start,
  LEAST(v_end_date, ft2.end_date) as overlap_end,
  LEAST(v_end_date, ft2.end_date) - GREATEST(v_start_date, ft2.start_date) + 1 as overlap_days,
  -- Get shared interests
  COALESCE(
    ARRAY(
      SELECT i.name
      FROM user_interests ui1
        JOIN interests i ON ui1.interest_id = i.id
        JOIN user_interests ui2 ON ui2.interest_id = i.id
      WHERE ui1.user_id = v_user_id
        AND ui2.user_id = ft2.user_id
    ),
    ARRAY []::text []
  ) as shared_interests,
  -- Get shared interest emoticons
  COALESCE(
    ARRAY(
      SELECT i.emoticon
      FROM user_interests ui1
        JOIN interests i ON ui1.interest_id = i.id
        JOIN user_interests ui2 ON ui2.interest_id = i.id
      WHERE ui1.user_id = v_user_id
        AND ui2.user_id = ft2.user_id
        AND i.emoticon IS NOT NULL
    ),
    ARRAY []::text []
  ) as shared_interest_emoticons,
  -- Count of shared interests for sorting
  (
    SELECT COUNT(*)
    FROM user_interests ui1
      JOIN user_interests ui2 ON ui1.interest_id = ui2.interest_id
    WHERE ui1.user_id = v_user_id
      AND ui2.user_id = ft2.user_id
  )::INTEGER as shared_interests_count
FROM future_trips ft2
  JOIN cities c ON ft2.city_id = c.id
  JOIN user_profiles up ON ft2.user_id = up.user_id
WHERE ft2.city_id = v_city_id
  AND ft2.user_id != v_user_id -- Check for overlapping dates
  AND v_start_date <= ft2.end_date
  AND v_end_date >= ft2.start_date -- Only future trips
  AND ft2.end_date >= CURRENT_DATE
ORDER BY shared_interests_count DESC,
  ft2.start_date ASC;
END;
$$;


CREATE OR REPLACE FUNCTION is_instagram_tag_available(p_tag text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN NOT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE lower(instagram_handle) = lower(p_tag)
  );
END;
$$;


CREATE OR REPLACE FUNCTION is_linkedin_tag_available(p_tag text) RETURNS boolean LANGUAGE plpgsql AS $$ BEGIN RETURN NOT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE lower(linkedin_handle) = lower(p_tag)
  );
END;
$$;


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


create or replace function create_user_report(
    reporter uuid,
    reported uuid,
    reason text,
    details text default null
  ) returns uuid language plpgsql security definer
set search_path = public as $$
declare report_id uuid;
existing_reasons text [];
begin -- Validate that reporter and reported users exist
if not exists (
  select 1
  from user_profiles
  where user_id = reporter
) then raise exception 'Reporter user does not exist';
end if;
if not exists (
  select 1
  from user_profiles
  where user_id = reported
) then raise exception 'Reported user does not exist';
end if;
-- Prevent users from reporting themselves
if reporter = reported then raise exception 'Users cannot report themselves';
end if;
-- Check for existing report with the same reason (explicit check with proper column qualification)
if exists (
  select 1
  from user_reports ur
  where ur.reporter_id = reporter
    and ur.reported_id = reported
    and ur.reason = create_user_report.reason -- Properly qualify the parameter
) then -- Get all existing reasons for debugging
select array_agg(ur.reason) into existing_reasons
from user_reports ur
where ur.reporter_id = reporter
  and ur.reported_id = reported;
raise exception 'You have already reported this user for the reason "%". Please select a different reason. Previous reports: %',
create_user_report.reason,
existing_reasons;
end if;
-- Insert the report
insert into user_reports (
    reporter_id,
    reported_id,
    reason,
    details,
    status
  )
values (
    reporter,
    reported,
    create_user_report.reason,
    -- Properly qualify the parameter
    details,
    'pending'
  )
returning id into report_id;
return report_id;
exception
when unique_violation then -- Get existing reasons for better error message
select array_agg(ur.reason) into existing_reasons
from user_reports ur
where ur.reporter_id = reporter
  and ur.reported_id = reported;
raise exception 'Duplicate report detected for reason "%". Previous reports: %',
create_user_report.reason,
existing_reasons;
end;
$$;


CREATE OR REPLACE FUNCTION join_direct_chat(p_user1 uuid, p_user2 uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_chat_id uuid;
BEGIN -- Check if a direct chat already exists between these two users (any order)
SELECT c.id INTO v_chat_id
FROM chats c
  JOIN participants p1 ON p1.chat_id = c.id
  JOIN participants p2 ON p2.chat_id = c.id
WHERE c.chat_type = 'direct'
  AND (
    (
      p1.user_id = p_user1
      AND p2.user_id = p_user2
    )
    OR (
      p1.user_id = p_user2
      AND p2.user_id = p_user1
    )
  )
LIMIT 1;
-- If not found, create a new one
IF v_chat_id IS NULL THEN
INSERT INTO chats (chat_type, created_at)
VALUES ('direct', timezone('utc', now()))
RETURNING id INTO v_chat_id;
INSERT INTO participants (chat_id, user_id)
VALUES (v_chat_id, p_user1),
  (v_chat_id, p_user2);
END IF;
RETURN v_chat_id;
END;
$$;


CREATE OR REPLACE FUNCTION create_direct_message(
    p_sender_id uuid,
    p_recipient_id uuid,
    p_message text
  ) RETURNS TABLE (
    message_id uuid,
    chat_id uuid,
    user_id uuid,
    message text,
    created_at timestamptz,
    display_name text,
    avatar_url text
  ) LANGUAGE plpgsql AS $$
DECLARE v_chat_id uuid;
v_msg_id uuid;
BEGIN -- Verify sender is authenticated
IF auth.uid() IS NULL
OR auth.uid() != p_sender_id THEN RAISE EXCEPTION 'Unauthorized';
END IF;
-- Get or create direct chat
SELECT join_direct_chat(p_sender_id, p_recipient_id) INTO v_chat_id;
-- Insert the message
INSERT INTO messages (chat_id, user_id, message, created_at)
VALUES (
    v_chat_id,
    p_sender_id,
    p_message,
    timezone('utc', now())
  )
RETURNING id INTO v_msg_id;
-- Return the full row with user info
RETURN QUERY
SELECT m.id as message_id,
  m.chat_id,
  m.user_id,
  m.message,
  m.created_at,
  u.display_name,
  u.avatar_url
FROM messages m
  JOIN user_profiles u ON u.user_id = m.user_id
WHERE m.id = v_msg_id;
END;
$$;


CREATE OR REPLACE FUNCTION leave_chat(p_chat_id UUID, p_user_id UUID, p_chat_type TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF p_chat_type = 'direct' THEN -- For direct messages, mark as hidden in participants table
UPDATE participants
SET hidden = TRUE
WHERE chat_id = p_chat_id
  AND user_id = p_user_id;
-- If no row was updated, insert a new participant record as hidden
IF NOT FOUND THEN
INSERT INTO participants (chat_id, user_id, hidden, joined_at)
VALUES (p_chat_id, p_user_id, TRUE, NOW()) ON CONFLICT (chat_id, user_id) DO
UPDATE
SET hidden = TRUE;
END IF;
ELSE -- For group chats (meetup, trip, event), remove user from participants
DELETE FROM participants
WHERE chat_id = p_chat_id
  AND user_id = p_user_id;
END IF;
END;
$$;


CREATE OR REPLACE FUNCTION delete_trip(p_trip_id uuid, p_user_id uuid) RETURNS boolean AS $$
DECLARE v_city_id uuid;
v_chat_id uuid;
BEGIN -- Get the city_id from the trip before deleting
SELECT city_id INTO v_city_id
FROM future_trips
WHERE id = p_trip_id
  AND user_id = p_user_id;
-- If trip not found or doesn't belong to user, return false
IF v_city_id IS NULL THEN RETURN FALSE;
END IF;
-- Get the chat_id for this city
SELECT id INTO v_chat_id
FROM chats
WHERE chat_type = 'trip'
  AND trip_id = v_city_id;
-- Delete the trip
DELETE FROM future_trips
WHERE id = p_trip_id
  AND user_id = p_user_id;
-- Remove user from city chat participants if chat exists
IF v_chat_id IS NOT NULL THEN
DELETE FROM participants
WHERE chat_id = v_chat_id
  AND user_id = p_user_id;
END IF;
RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION delete_message(p_message_id uuid, p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE message_exists boolean;
is_message_owner boolean;
BEGIN -- Check if message exists
SELECT EXISTS(
    SELECT 1
    FROM messages
    WHERE id = p_message_id
  ) INTO message_exists;
IF NOT message_exists THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Message not found'
);
END IF;
-- Check if user owns the message
SELECT EXISTS(
    SELECT 1
    FROM messages
    WHERE id = p_message_id
      AND user_id = p_user_id
  ) INTO is_message_owner;
IF NOT is_message_owner THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'You can only delete your own messages'
);
END IF;
-- Delete the message
DELETE FROM messages
WHERE id = p_message_id
  AND user_id = p_user_id;
RETURN jsonb_build_object(
  'success',
  true,
  'message',
  'Message deleted successfully'
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Failed to delete message: ' || SQLERRM
);
END;
$$;


CREATE OR REPLACE FUNCTION get_user_references(user_id_param UUID) RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_display_name TEXT,
    author_full_name TEXT,
    author_avatar_url TEXT,
    message TEXT,
    rating INTEGER,
    meeting_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE
  ) AS $$ BEGIN RETURN QUERY
SELECT ur.id,
  ur.author_id,
  ur.author_display_name,
  ur.author_full_name,
  ur.author_avatar_url,
  ur.message,
  ur.rating,
  ur.meeting_context,
  ur.created_at
FROM user_references_with_details ur
WHERE ur.subject_id = user_id_param
ORDER BY ur.created_at DESC;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_user_reference_stats(user_id_param UUID) RETURNS TABLE (
    total_references BIGINT,
    average_rating NUMERIC
  ) AS $$ BEGIN RETURN QUERY
SELECT COUNT(*) as total_references,
  ROUND(AVG(rating), 1) as average_rating
FROM user_references
WHERE subject_id = user_id_param;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.cleanup_verification_images_30_days() RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER := 0;
verification_record RECORD;
file_path TEXT;
target_date DATE;
BEGIN -- Calculate the target date (30 days ago)
target_date := CURRENT_DATE - INTERVAL '30 days';
-- Log the start of cleanup
RAISE NOTICE 'Starting verification images cleanup for users registered on % at %',
target_date,
NOW();
-- Get verification photo URLs for users who registered exactly 30 days ago
FOR verification_record IN
SELECT user_id,
  verification_photo_url
FROM user_profiles
WHERE verification_photo_url IS NOT NULL
  AND verification_photo_url != ''
  AND DATE(created_at) = target_date LOOP -- Extract file path from the full URL
  -- URL format: https://[project].supabase.co/storage/v1/object/public/face-verification-images/[filename]
  file_path := SUBSTRING(
    verification_record.verification_photo_url
    FROM 'face-verification-images/(.+)$'
  );
IF file_path IS NOT NULL THEN BEGIN -- Delete the file from storage bucket
PERFORM storage.delete('face-verification-images', file_path);
-- Update the user profile to set verification_photo_url and verification_pose to null
UPDATE user_profiles
SET verification_photo_url = NULL,
  verification_pose = NULL
WHERE user_id = verification_record.user_id;
deleted_count := deleted_count + 1;
RAISE NOTICE 'Deleted verification image for user % (file: %) - registered on %',
verification_record.user_id,
file_path,
target_date;
EXCEPTION
WHEN OTHERS THEN -- Log error but continue with other files
RAISE NOTICE 'Failed to delete verification image for user % (file: %): %',
verification_record.user_id,
file_path,
SQLERRM;
END;
END IF;
END LOOP;
-- Log the completion
RAISE NOTICE 'Completed verification images cleanup for users registered on %. Deleted % files at %',
target_date,
deleted_count,
NOW();
RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.create_activity(
    p_created_by uuid,
    p_type text,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_emoticon text DEFAULT NULL,
    p_intent activity_intent DEFAULT NULL,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL,
    p_start_date_time timestamptz DEFAULT NULL,
    p_end_date_time timestamptz DEFAULT NULL,
    p_meeting_time timestamptz DEFAULT NULL,
    p_expires_at timestamptz DEFAULT (NOW() + INTERVAL '1 day'),
    p_is_public boolean DEFAULT true,
    p_female_only boolean DEFAULT false,
    p_max_participants integer DEFAULT NULL,
    p_image_url text DEFAULT NULL,
    p_video_url text DEFAULT NULL,
    p_time_type text DEFAULT 'flexible',
    p_time_window tstzrange DEFAULT NULL
  ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_activity_id uuid;
new_chat_id uuid;
v_expires_at timestamptz;
BEGIN -- Validate type
IF p_type NOT IN ('event', 'meetup', 'blend') THEN RAISE EXCEPTION 'Invalid activity type: %',
p_type;
END IF;
-- Set expiration based on type
IF p_type = 'blend' THEN v_expires_at := NOW() + INTERVAL '8 hour';
ELSIF p_type = 'meetup' THEN v_expires_at := NOW() + INTERVAL '24 hours';
ELSIF p_type = 'event' THEN IF p_end_date_time IS NOT NULL THEN v_expires_at := p_end_date_time;
ELSE v_expires_at := p_expires_at;
END IF;
ELSE v_expires_at := p_expires_at;
END IF;
-- Insert Activity
INSERT INTO activities (
    id,
    created_by,
    type,
    title,
    description,
    emoticon,
    intent,
    latitude,
    longitude,
    start_date_time,
    end_date_time,
    meeting_time,
    expires_at,
    is_public,
    female_only,
    max_participants,
    image_url,
    video_url,
    time_type,
    time_window,
    created_at,
    updated_at
  )
VALUES (
    gen_random_uuid(),
    p_created_by,
    p_type,
    p_title,
    p_description,
    p_emoticon,
    p_intent,
    p_latitude,
    p_longitude,
    p_start_date_time,
    p_end_date_time,
    p_meeting_time,
    v_expires_at,
    p_is_public,
    p_female_only,
    p_max_participants,
    p_image_url,
    p_video_url,
    p_time_type,
    p_time_window,
    NOW(),
    NOW()
  )
RETURNING id INTO new_activity_id;
-- Create Chat for the Activity
-- We ensure a chat exists for every activity to enable communication
INSERT INTO chats (
    chat_type,
    activity_id,
    owner_user_id,
    created_at,
    updated_at
  )
VALUES (
    p_type,
    new_activity_id,
    p_created_by,
    NOW(),
    NOW()
  )
RETURNING id INTO new_chat_id;
-- Add Creator as Participant
-- Automatically join the creator to the chat
INSERT INTO participants (
    chat_id,
    user_id,
    joined_at,
    rsvp_status
  )
VALUES (
    new_chat_id,
    p_created_by,
    NOW(),
    'going'
  );
RETURN new_activity_id;
EXCEPTION
WHEN OTHERS THEN -- Re-raise exception to ensure transaction rollback
RAISE;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_reel_activities(
    p_user_id uuid,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0,
    p_max_distance_km double precision DEFAULT NULL,
    p_activity_type text DEFAULT NULL,
    p_female_only boolean DEFAULT NULL,
    p_intent activity_intent DEFAULT NULL
) RETURNS TABLE (
    out_activity_id uuid,
    out_type text,
    out_title text,
    out_description text,
    out_emoticon text,
    out_intent activity_intent,
    out_video_url text,
    out_image_url text,
    out_is_public boolean,
    out_female_only boolean,
    out_created_at timestamptz,
    out_expires_at timestamptz,
    out_distance_km double precision,
    out_creator_id uuid,
    out_display_name text,
    out_full_name text,
    out_avatar_url text,
    out_instagram_handle text,
    out_current_city text,
    out_trust_score integer,
    out_time_type text,
    out_time_window tstzrange,
    out_end_date_time timestamptz,
    out_participants jsonb,
    out_final_score double precision
) LANGUAGE sql STABLE AS $$
WITH base AS (
    SELECT 
        a.id AS activity_id,
        a.type,
        a.title,
        a.description,
        a.emoticon,
        a.intent,
        a.video_url,
        a.image_url,
        a.is_public,
        a.female_only,
        a.created_at,
        a.expires_at,
        a.time_type,
        a.time_window,
        a.end_date_time,
        u.user_id AS creator_id,
        u.display_name,
        u.full_name,
        u.avatar_url,
        u.instagram_handle,
        u.current_city,
        u.trust_score,
        -- distance
        CASE
            WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN 
                ST_DistanceSphere(
                    ST_MakePoint(a.longitude, a.latitude),
                    ST_MakePoint(p_longitude, p_latitude)
                ) / 1000
            ELSE NULL
        END AS distance_km,
        -- freshness
        EXP(- EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 86400) AS freshness_score,
        -- distance weight
        CASE
            WHEN p_latitude IS NULL THEN 0.3
            ELSE 1 / (
                1 + (
                    ST_DistanceSphere(
                        ST_MakePoint(a.longitude, a.latitude),
                        ST_MakePoint(p_longitude, p_latitude)
                    ) / 1000
                )
            )
        END AS distance_score,
        -- intent weight
        CASE
            WHEN p_intent IS NULL THEN 0
            WHEN a.intent = p_intent THEN 1
            ELSE -0.5
        END AS intent_score,
        -- normalized trust
        (u.trust_score / 100.0) AS trust_score_norm,
        -- creator diversity penalty
        ROW_NUMBER() OVER (
            PARTITION BY a.created_by
            ORDER BY a.created_at DESC
        ) * 0.15 AS creator_penalty,
        random() * 0.15 AS randomness
    FROM activities a
    JOIN user_profiles u ON u.user_id = a.created_by
    WHERE a.is_public = true
      AND (a.expires_at IS NULL OR a.expires_at > now())
      AND a.created_by <> p_user_id
      AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = a.created_by)
             OR (ub.blocker_id = a.created_by AND ub.blocked_id = p_user_id)
      )
      -- distance filter with default 50km
      AND (
          p_latitude IS NULL 
          OR p_longitude IS NULL
          OR ST_DistanceSphere(
                ST_MakePoint(a.longitude, a.latitude),
                ST_MakePoint(p_longitude, p_latitude)
             ) <= COALESCE(p_max_distance_km, 50) * 1000
      )
      -- type filter
      AND (
          p_activity_type IS NULL
          OR p_activity_type = 'all'
          OR a.type = p_activity_type
      )
      -- female only filter
      AND (
          p_female_only IS NULL
          OR a.female_only = p_female_only
      )
),
ranked AS (
    SELECT *,
        (freshness_score * 0.35 + distance_score * 0.25 + trust_score_norm * 0.20 + intent_score * 0.20 - creator_penalty + randomness) AS final_score
    FROM base
)
SELECT
    r.activity_id AS out_activity_id,
    r.type AS out_type,
    r.title AS out_title,
    r.description AS out_description,
    r.emoticon AS out_emoticon,
    r.intent AS out_intent,
    r.video_url AS out_video_url,
    r.image_url AS out_image_url,
    r.is_public AS out_is_public,
    r.female_only AS out_female_only,
    r.created_at AS out_created_at,
    r.expires_at AS out_expires_at,
    r.distance_km AS out_distance_km,
    r.creator_id AS out_creator_id,
    r.display_name AS out_display_name,
    r.full_name AS out_full_name,
    r.avatar_url AS out_avatar_url,
    r.instagram_handle AS out_instagram_handle,
    r.current_city AS out_current_city,
    r.trust_score AS out_trust_score,
    r.time_type AS out_time_type,
    r.time_window AS out_time_window,
    r.end_date_time AS out_end_date_time,
    COALESCE(p.participants, '[]'::jsonb) AS out_participants,
    r.final_score AS out_final_score
FROM ranked r
LEFT JOIN LATERAL (
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', up.user_id,
            'avatar_url', up.avatar_url,
            'display_name', up.display_name
        )
    ) AS participants
    FROM chats c
    JOIN participants pa ON pa.chat_id = c.id
    JOIN user_profiles up ON up.user_id = pa.user_id
    WHERE c.activity_id = r.activity_id
) p ON true
ORDER BY final_score DESC
LIMIT p_limit OFFSET p_offset;
$$;


CREATE OR REPLACE FUNCTION public.mark_reel_activities_viewed(p_user_id uuid, p_activity_ids uuid []) RETURNS void LANGUAGE sql AS $$
INSERT INTO user_activity_views (user_id, activity_id)
SELECT p_user_id,
  unnest(p_activity_ids) ON CONFLICT DO NOTHING;
$$;


CREATE OR REPLACE FUNCTION public.get_user_activities(
    p_user_id uuid,
    p_status text DEFAULT 'all',
    -- 'all', 'active', 'expired', 'upcoming'
    p_activity_type text DEFAULT 'all',
    -- 'all', 'meetup', 'event', 'blend'
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
  ) RETURNS TABLE (
    activity_id uuid,
    activity_type text,
    title text,
    description text,
    emoticon text,
    intent activity_intent,
    -- ENUM type
    latitude double precision,
    longitude double precision,
    start_date_time timestamptz,
    end_date_time timestamptz,
    meeting_time timestamptz,
    expires_at timestamptz,
    is_public boolean,
    female_only boolean,
    max_participants integer,
    image_url text,
    video_url text,
    created_at timestamptz,
    participant_count bigint,
    status text,
    -- 'active', 'expired', 'upcoming'
    time_type text
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT a.id AS activity_id,
  a.type AS activity_type,
  a.title,
  a.description,
  a.emoticon,
  a.intent,
  a.latitude,
  a.longitude,
  a.start_date_time,
  a.end_date_time,
  a.meeting_time,
  a.expires_at,
  a.is_public,
  a.female_only,
  a.max_participants,
  a.image_url,
  a.video_url,
  a.created_at,
  COALESCE(pc.participant_count, 0) AS participant_count,
  CASE
    WHEN a.expires_at IS NOT NULL
    AND a.expires_at <= NOW() THEN 'expired'
    WHEN (
      a.start_date_time IS NOT NULL
      AND a.start_date_time > NOW()
    )
    OR (
      a.meeting_time IS NOT NULL
      AND a.meeting_time > NOW()
    ) THEN 'upcoming'
    ELSE 'active'
  END AS status,
  a.time_type
FROM activities a
  LEFT JOIN (
    SELECT c.activity_id,
      COUNT(p.user_id) AS participant_count
    FROM chats c
      JOIN participants p ON p.chat_id = c.id
    WHERE c.activity_id IS NOT NULL
    GROUP BY c.activity_id
  ) pc ON pc.activity_id = a.id
WHERE a.created_by = p_user_id
  AND (
    p_activity_type = 'all'
    OR a.type = p_activity_type
  )
  AND (
    p_status = 'all'
    OR (
      p_status = 'expired'
      AND a.expires_at IS NOT NULL
      AND a.expires_at <= NOW()
    )
    OR (
      p_status = 'upcoming'
      AND (
        (
          a.start_date_time IS NOT NULL
          AND a.start_date_time > NOW()
        )
        OR (
          a.meeting_time IS NOT NULL
          AND a.meeting_time > NOW()
        )
      )
    )
    OR (
      p_status = 'active'
      AND (
        a.expires_at IS NULL
        OR a.expires_at > NOW()
      )
      AND (
        a.start_date_time IS NULL
        OR a.start_date_time <= NOW()
      )
      AND (
        a.meeting_time IS NULL
        OR a.meeting_time <= NOW()
      )
    )
  )
ORDER BY a.created_at DESC
LIMIT p_limit OFFSET p_offset;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_activity(
    p_activity_id uuid,
    p_user_id uuid,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_emoticon text DEFAULT NULL,
    p_intent activity_intent DEFAULT NULL,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL,
    p_start_date_time timestamptz DEFAULT NULL,
    p_end_date_time timestamptz DEFAULT NULL,
    p_meeting_time timestamptz DEFAULT NULL,
    p_expires_at timestamptz DEFAULT NULL,
    p_is_public boolean DEFAULT NULL,
    p_female_only boolean DEFAULT NULL,
    p_max_participants integer DEFAULT NULL,
    p_image_url text DEFAULT NULL,
    p_video_url text DEFAULT NULL,
    p_time_type text DEFAULT NULL
  ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE activity_record RECORD;
updated_count INTEGER := 0;
BEGIN -- First, try to update in activities table
UPDATE activities
SET title = COALESCE(p_title, title),
  description = COALESCE(p_description, description),
  emoticon = COALESCE(p_emoticon, emoticon),
  intent = COALESCE(p_intent, intent),
  latitude = COALESCE(p_latitude, latitude),
  longitude = COALESCE(p_longitude, longitude),
  start_date_time = COALESCE(p_start_date_time, start_date_time),
  end_date_time = COALESCE(p_end_date_time, end_date_time),
  meeting_time = COALESCE(p_meeting_time, meeting_time),
  expires_at = COALESCE(p_expires_at, expires_at),
  is_public = COALESCE(p_is_public, is_public),
  female_only = COALESCE(p_female_only, female_only),
  max_participants = COALESCE(p_max_participants, max_participants),
  image_url = COALESCE(p_image_url, image_url),
  video_url = COALESCE(p_video_url, video_url),
  time_type = COALESCE(p_time_type, time_type),
  updated_at = NOW()
WHERE id = p_activity_id
  AND created_by = p_user_id;
GET DIAGNOSTICS updated_count = ROW_COUNT;
IF updated_count = 0 THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Activity not found or you do not have permission to update it'
);
END IF;
RETURN jsonb_build_object(
  'success',
  true,
  'message',
  'Activity updated successfully'
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Failed to update activity: ' || SQLERRM
);
END;
$$;


CREATE OR REPLACE FUNCTION public.delete_activity(p_activity_id uuid, p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER := 0;
chat_ids_to_delete uuid [];
BEGIN -- First, try to delete from activities table
DELETE FROM activities
WHERE id = p_activity_id
  AND created_by = p_user_id;
GET DIAGNOSTICS deleted_count = ROW_COUNT;
IF deleted_count = 0 THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Activity not found or you do not have permission to delete it'
);
END IF;
RETURN jsonb_build_object(
  'success',
  true,
  'message',
  'Activity deleted successfully'
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Failed to delete activity: ' || SQLERRM
);
END;
$$;


CREATE OR REPLACE FUNCTION public.get_activities_in_bounds(
    p_user_id uuid,
    p_min_lat double precision,
    p_max_lat double precision,
    p_min_lng double precision,
    p_max_lng double precision
  ) RETURNS TABLE (
    id uuid,
    activity_type text,
    title text,
    description text,
    latitude double precision,
    longitude double precision,
    start_datetime timestamptz,
    end_datetime timestamptz,
    created_by uuid,
    creator_display_name text,
    creator_avatar_url text,
    participant_count int,
    max_participants integer,
    is_participant boolean,
    is_public boolean,
    image_url text,
    emoticon text,
    chat_id uuid,
    created_at timestamptz
  ) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        a.id,
        a.type AS activity_type,
        a.title,
        a.description,
        a.latitude,
        a.longitude,
        a.start_date_time AS start_datetime,
        a.end_date_time AS end_datetime,
        a.created_by,
        up.display_name AS creator_display_name,
        up.avatar_url AS creator_avatar_url,
        COALESCE(
            (SELECT COUNT(*) FROM participants p WHERE p.chat_id = c.id), 
            0
        )::int AS participant_count,
        a.max_participants,
        COALESCE(
            EXISTS (
                SELECT 1 
                FROM participants p 
                WHERE p.chat_id = c.id AND p.user_id = p_user_id
            ),
            false
        ) AS is_participant,
        a.is_public,
        a.image_url,
        a.emoticon,
        c.id AS chat_id,
        a.created_at
    FROM activities a
    LEFT JOIN user_profiles up ON a.created_by = up.user_id
    LEFT JOIN chats c ON c.activity_id = a.id
    WHERE a.latitude BETWEEN p_min_lat AND p_max_lat
      AND a.longitude BETWEEN p_min_lng AND p_max_lng
      AND a.is_public = true
      AND (
          a.expires_at IS NULL 
          OR a.expires_at > now()
      )
    ORDER BY a.start_date_time ASC;
$$;



CREATE OR REPLACE FUNCTION public.get_activities_map(
    p_user_id uuid,
    p_min_lat double precision,
    p_max_lat double precision,
    p_min_lng double precision,
    p_max_lng double precision
  ) RETURNS TABLE (
    activity_id uuid,
    type text,
    title text,
    description text,
    latitude double precision,
    longitude double precision,
    start_datetime timestamptz,
    end_datetime timestamptz,
    creator_id uuid,
    display_name text,
    avatar_url text,
    participant_count int,
    max_participants integer,
    is_participant boolean,
    is_public boolean,
    image_url text,
    emoticon text,
    chat_id uuid,
    created_at timestamptz,
    time_type text,
    time_window text,
    expires_at timestamptz,
    intent activity_intent,
    female_only boolean
  ) LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT a.id AS activity_id,
  a.type::text,
  a.title,
  a.description,
  a.latitude,
  a.longitude,
  a.start_date_time,
  a.end_date_time,
  a.created_by AS creator_id,
  up.display_name,
  up.avatar_url,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM participants p_count
      WHERE p_count.chat_id = c.id
    ),
    0
  )::int as participant_count,
  a.max_participants,
  COALESCE(
    EXISTS (
      SELECT 1
      FROM participants p_check
      WHERE p_check.chat_id = c.id
        AND p_check.user_id = p_user_id
    ),
    false
  ) as is_participant,
  a.is_public,
  a.image_url,
  a.emoticon,
  c.id as chat_id,
  a.created_at,
  a.time_type,
  a.time_window,
  a.expires_at,
  a.intent,
  a.female_only
FROM activities a
  LEFT JOIN user_profiles up ON a.created_by = up.user_id
  LEFT JOIN chats c ON c.activity_id = a.id
WHERE a.latitude BETWEEN p_min_lat AND p_max_lat
  AND a.longitude BETWEEN p_min_lng AND p_max_lng
  AND a.is_public = true
  AND (
    a.expires_at IS NULL
    OR a.expires_at > now()
  )
GROUP BY a.id,
  a.type,
  a.title,
  a.description,
  a.latitude,
  a.longitude,
  a.start_date_time,
  a.end_date_time,
  a.created_by,
  up.display_name,
  up.avatar_url,
  a.max_participants,
  a.is_public,
  a.image_url,
  a.emoticon,
  c.id,
  a.created_at,
  a.time_type,
  a.time_window,
  a.expires_at,
  a.intent,
  a.female_only
ORDER BY a.start_date_time ASC;
$$;


create or replace function public.join_activity(
    p_user_id uuid,
    p_activity_id uuid,
    p_activity_type text,
    p_rsvp_status text default 'maybe'
  ) returns jsonb language plpgsql security definer as $$
declare activity_data record;
existing_chat_id uuid;
new_chat_id uuid;
chat_type_name text;
begin -- 1. Validate activity type
if p_activity_type not in ('event', 'meetup', 'blend') then return jsonb_build_object(
  'success',
  false,
  'error',
  'Invalid activity type'
);
end if;
-- 2. Get activity details from unified activities table
select a.id,
  a.title,
  a.created_by,
  a.type,
  a.expires_at into activity_data
from activities a
where a.id = p_activity_id
  and a.type = p_activity_type
  and (
    a.expires_at is null
    or a.expires_at > now()
  );
-- 3. Check if activity exists and is not expired
if activity_data is null then return jsonb_build_object(
  'success',
  false,
  'error',
  'Activity not found or expired'
);
end if;
-- 5. Set chat type based on activity type
if p_activity_type = 'event' then chat_type_name := 'event';
elsif p_activity_type = 'meetup' then chat_type_name := 'meetup';
elsif p_activity_type = 'blend' then chat_type_name := 'blend';
end if;
-- 6. Check if a chat already exists for this activity
select c.id into existing_chat_id
from chats c
where c.chat_type = chat_type_name
  and c.activity_id = p_activity_id
limit 1;
-- 7. If no existing chat, create one
if existing_chat_id is null then
insert into chats (chat_type, activity_id, created_at)
values (
    chat_type_name,
    p_activity_id,
    timezone('utc', now())
  )
returning id into new_chat_id;
else new_chat_id := existing_chat_id;
end if;
-- 8. Check if user is already a participant in this chat
if exists (
  select 1
  from participants p
  where p.chat_id = new_chat_id
    and p.user_id = p_user_id
) then return jsonb_build_object(
  'success',
  false,
  'error',
  'Already joined this activity',
  'error_code',
  'ALREADY_JOINED',
  'chat_id',
  new_chat_id
);
end if;
-- 9. Add user to chat participants
insert into participants (user_id, chat_id, joined_at, rsvp_status)
values (
    p_user_id,
    new_chat_id,
    timezone('utc', now()),
    p_rsvp_status
  ) on conflict (chat_id, user_id) do
update
set rsvp_status = excluded.rsvp_status;
-- 10. Add activity creator to chat participants if not already there
insert into participants (user_id, chat_id, joined_at)
values (
    activity_data.created_by,
    new_chat_id,
    timezone('utc', now())
  ) on conflict (chat_id, user_id) do nothing;
-- 11. Return success with chat details
return jsonb_build_object(
  'success',
  true,
  'message',
  'Successfully joined activity',
  'chat_id',
  new_chat_id,
  'chat_type',
  chat_type_name,
  'activity_title',
  activity_data.title
);
exception
when others then return jsonb_build_object(
  'success',
  false,
  'error',
  'Unexpected error: ' || sqlerrm
);
end;
$$;


CREATE OR REPLACE FUNCTION delete_or_leave_chat(p_chat_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_chat_type text;
v_user_id uuid;
BEGIN v_user_id := auth.uid();
-- Get chat type
SELECT chat_type INTO v_chat_type
FROM chats
WHERE id = p_chat_id;
IF v_chat_type IS NULL THEN RAISE EXCEPTION 'Chat not found';
END IF;
IF v_chat_type = 'direct' THEN -- For direct chats, hide the chat for the user
UPDATE participants
SET hidden = true
WHERE chat_id = p_chat_id
  AND user_id = v_user_id;
ELSE -- For group chats (trip, event, meetup, hangout, etc.), remove the participant
DELETE FROM participants
WHERE chat_id = p_chat_id
  AND user_id = v_user_id;
END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_activity(
    p_activity_id uuid,
    p_user_id uuid,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_emoticon text DEFAULT NULL,
    p_intent activity_intent DEFAULT NULL,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL,
    p_start_date_time timestamptz DEFAULT NULL,
    p_end_date_time timestamptz DEFAULT NULL,
    p_meeting_time timestamptz DEFAULT NULL,
    p_expires_at timestamptz DEFAULT NULL,
    p_is_public boolean DEFAULT NULL,
    p_female_only boolean DEFAULT NULL,
    p_max_participants integer DEFAULT NULL,
    p_image_url text DEFAULT NULL,
    p_video_url text DEFAULT NULL,
    p_time_type text DEFAULT NULL
  ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE activity_record RECORD;
updated_count INTEGER := 0;
BEGIN -- First, try to update in activities table
UPDATE activities
SET title = COALESCE(p_title, title),
  description = COALESCE(p_description, description),
  emoticon = COALESCE(p_emoticon, emoticon),
  intent = COALESCE(p_intent, intent),
  latitude = COALESCE(p_latitude, latitude),
  longitude = COALESCE(p_longitude, longitude),
  start_date_time = COALESCE(p_start_date_time, start_date_time),
  end_date_time = COALESCE(p_end_date_time, end_date_time),
  meeting_time = COALESCE(p_meeting_time, meeting_time),
  expires_at = COALESCE(p_expires_at, expires_at),
  is_public = COALESCE(p_is_public, is_public),
  female_only = COALESCE(p_female_only, female_only),
  max_participants = COALESCE(p_max_participants, max_participants),
  image_url = COALESCE(p_image_url, image_url),
  video_url = COALESCE(p_video_url, video_url),
  time_type = COALESCE(p_time_type, time_type),
  updated_at = NOW()
WHERE id = p_activity_id
  AND created_by = p_user_id;
GET DIAGNOSTICS updated_count = ROW_COUNT;
IF updated_count = 0 THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Activity not found or you do not have permission to update it'
);
END IF;
RETURN jsonb_build_object(
  'success',
  true,
  'message',
  'Activity updated successfully'
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object(
  'success',
  false,
  'error',
  'Failed to update activity: ' || SQLERRM
);
END;
$$;


create or replace function get_users_by_phone_numbers(phone_numbers text [], current_user_id uuid) returns table (
    uid uuid,
    display_name text,
    full_name text,
    avatar_url text,
    mobile_number text,
    relationship_status text
  ) language sql security definer as $$
select u.user_id as uid,
  u.display_name,
  u.full_name,
  u.avatar_url,
  u.mobile_number,
  case
    when exists (
      select 1
      from friends f
      where (
          f.user_id = current_user_id
          and f.friend_id = u.user_id
        )
        or (
          f.user_id = u.user_id
          and f.friend_id = current_user_id
        )
    ) then 'friends'
    when exists (
      select 1
      from friend_requests fr
      where fr.sender_id = current_user_id
        and fr.receiver_id = u.user_id
    ) then 'request_sent'
    when exists (
      select 1
      from friend_requests fr
      where fr.sender_id = u.user_id
        and fr.receiver_id = current_user_id
    ) then 'request_received'
    else 'none'
  end as relationship_status
from user_profiles u
where u.mobile_number = any(phone_numbers)
  and u.user_id != current_user_id;
$$;


create or replace function public.touch_user_device(
    _user_id uuid,
    _device_id text,
    _platform text,
    _app_version text default null
  ) returns void language plpgsql security definer as $$ begin
insert into user_devices (
    user_id,
    device_id,
    platform,
    app_version,
    last_seen,
    created_at
  )
values (
    _user_id,
    _device_id,
    _platform,
    _app_version,
    now(),
    now()
  ) on conflict (user_id, device_id) do
update
set last_seen = now(),
  platform = excluded.platform,
  app_version = excluded.app_version;
end;
$$;


create or replace function public.get_trip_details_by_id(p_trip_id uuid) returns table (
    trip_id uuid,
    chat_id uuid,
    user_id uuid,
    city_id uuid,
    city_name text,
    country text,
    start_date date,
    end_date date,
    notes text,
    latitude double precision,
    longitude double precision,
    created_at timestamptz
  ) language plpgsql security definer as $$ begin return query
select ft.id as trip_id,
  ch.id as chat_id,
  ft.user_id,
  c.id as city_id,
  c.name as city_name,
  c.country as city_country,
  ft.start_date,
  ft.end_date,
  ft.notes,
  c.lat as latitude,
  c.lon as longitude,
  ft.created_at
from future_trips ft
  join cities c on ft.city_id = c.id
  left join chats ch on ch.chat_type = 'trip'::text
  and ch.trip_id = c.id
where ft.id = p_trip_id;
end;
$$;


CREATE OR REPLACE FUNCTION public.update_participant_rsvp(
    p_chat_id uuid,
    p_user_id uuid,
    p_rsvp_status text
  ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE participants
SET rsvp_status = p_rsvp_status
WHERE chat_id = p_chat_id
  AND user_id = p_user_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_chat_participants(p_chat_id uuid) RETURNS TABLE (
    user_id uuid,
    display_name text,
    avatar_url text,
    rsvp_status text,
    is_creator boolean
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT up.user_id,
  up.display_name,
  up.avatar_url,
  p.rsvp_status,
  (c.owner_user_id = up.user_id) as is_creator
FROM participants p
  JOIN user_profiles up ON p.user_id = up.user_id
  JOIN chats c ON c.id = p.chat_id
WHERE p.chat_id = p_chat_id;
END;
$$;


CREATE OR REPLACE FUNCTION get_marketing_stats() RETURNS json LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE result json;
BEGIN
SELECT json_build_object(
    'total_active_users',
    (
      SELECT COUNT(*)
      FROM user_profiles
      WHERE status = 'active'
    ),
    'total_upcoming_activities',
    (
      SELECT COUNT(*)
      FROM activities
      WHERE expires_at >= NOW()
    )
  ) INTO result;
RETURN result;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_referral_source(
    p_user_id uuid,
    p_referral_source text,
    p_referral_source_other text DEFAULT NULL
  ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE user_profiles
SET referral_source = p_referral_source,
  referral_source_other = p_referral_source_other
WHERE user_id = p_user_id;
END;
$$;


create or replace function get_participant_rsvp_status(p_chat_id uuid, p_user_id uuid) returns text language plpgsql security definer as $$
declare v_status text;
begin
select rsvp_status into v_status
from participants
where chat_id = p_chat_id
  and user_id = p_user_id;
return v_status;
end;
$$;


CREATE OR REPLACE FUNCTION public.get_group_details(p_chat_id UUID, p_current_user_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_chat RECORD;
v_result JSONB;
v_participants JSONB;
v_details JSONB;
v_owner_id UUID;
v_creator_id UUID;
BEGIN -- 1. Get Chat Info
SELECT * INTO v_chat
FROM chats
WHERE id = p_chat_id;
IF v_chat IS NULL THEN RETURN jsonb_build_object('error', 'Chat not found');
END IF;
v_owner_id := v_chat.owner_user_id;
v_creator_id := v_owner_id;
-- Default to chat owner
-- 2. Get Details based on Chat Type (Fetch creator_id)
IF v_chat.activity_id IS NOT NULL THEN
SELECT jsonb_build_object(
    'title',
    a.title,
    'description',
    a.description,
    'emoticon',
    a.emoticon,
    'start_date_time',
    a.start_date_time,
    'end_date_time',
    a.end_date_time,
    'meeting_time',
    a.meeting_time,
    'expires_at',
    a.expires_at,
    'image_url',
    a.image_url,
    'intent',
    a.intent,
    'time_type',
    a.time_type
  ),
  created_by INTO v_details,
  v_creator_id
FROM activities a
WHERE a.id = v_chat.activity_id;
ELSIF v_chat.trip_id IS NOT NULL THEN
SELECT jsonb_build_object(
    'title',
    c.name,
    'description',
    'Trip to ' || c.name,
    'country',
    c.country,
    'type',
    'trip'
  ) INTO v_details
FROM cities c
WHERE c.id = v_chat.trip_id;
ELSE v_details := jsonb_build_object('title', 'Group Chat');
END IF;
-- 3. Get Participants (Using v_creator_id)
SELECT jsonb_agg(
    jsonb_build_object(
      'user_id',
      up.user_id,
      'display_name',
      up.display_name,
      'avatar_url',
      up.avatar_url,
      'country_of_origin',
      up.country_of_origin,
      'is_creator',
      (up.user_id = v_creator_id),
      'rsvp_status',
      p.rsvp_status,
      'joined_at',
      p.joined_at
    )
  ) INTO v_participants
FROM participants p
  JOIN user_profiles up ON p.user_id = up.user_id
WHERE p.chat_id = p_chat_id;
-- 4. Construct Final Result
v_result := jsonb_build_object(
  'chat_id',
  p_chat_id,
  'chat_type',
  v_chat.chat_type,
  'creator_id',
  v_creator_id,
  'is_current_user_creator',
  (v_creator_id = p_current_user_id),
  'participants',
  COALESCE(v_participants, '[]'::jsonb),
  'details',
  COALESCE(v_details, '{}'::jsonb)
);
RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION message_local_ambassador(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_country text;
v_ambassador_user_id uuid;
v_chat_id uuid;
v_display_name text;
v_avatar_url text;
BEGIN -- Get user's current country
SELECT current_country INTO v_country
FROM user_profiles
WHERE user_id = p_user_id;
-- No country set
IF v_country IS NULL THEN RAISE EXCEPTION 'COUNTRY_NOT_SET';
END IF;
-- Find an active local ambassador for the country
SELECT la.user_id INTO v_ambassador_user_id
FROM local_ambassadors la
WHERE la.country = v_country
  AND la.status = 'active'
ORDER BY la.priority DESC,
  la.created_at ASC
LIMIT 1;
-- No ambassador found
IF v_ambassador_user_id IS NULL THEN RAISE EXCEPTION 'NO_AMBASSADOR_FOUND';
END IF;
-- Create or reuse direct chat
v_chat_id := join_direct_chat(p_user_id, v_ambassador_user_id);
-- Get Ambassador Profile Details
SELECT display_name,
  avatar_url INTO v_display_name,
  v_avatar_url
FROM user_profiles
WHERE user_id = v_ambassador_user_id;
-- Success response
RETURN jsonb_build_object(
  'chat_id',
  v_chat_id,
  'ambassador_id',
  v_ambassador_user_id,
  'display_name',
  v_display_name,
  'avatar_url',
  v_avatar_url
);
END;
$$;


CREATE OR REPLACE FUNCTION make_user_local_ambassador(
    p_user_id uuid,
    p_country text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_priority integer DEFAULT 1,
    p_status text DEFAULT 'active',
    p_approved_by uuid DEFAULT NULL
  ) RETURNS TABLE (
    success boolean,
    ambassador_id uuid,
    error_code text
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_country text;
v_ambassador_id uuid;
BEGIN -- Validate user exists
IF NOT EXISTS (
  SELECT 1
  FROM user_profiles
  WHERE user_id = p_user_id
) THEN RETURN QUERY
SELECT false,
  NULL,
  'USER_NOT_FOUND';
RETURN;
END IF;
-- Resolve country
IF p_country IS NOT NULL THEN v_country := p_country;
ELSE
SELECT current_country INTO v_country
FROM user_profiles
WHERE user_id = p_user_id;
END IF;
IF v_country IS NULL THEN RETURN QUERY
SELECT false,
  NULL,
  'COUNTRY_REQUIRED';
RETURN;
END IF;
-- Insert or update ambassador
INSERT INTO local_ambassadors (
    user_id,
    country,
    city,
    priority,
    status,
    approved_by,
    approved_at
  )
VALUES (
    p_user_id,
    v_country,
    p_city,
    p_priority,
    p_status,
    p_approved_by,
    timezone('utc', now())
  ) ON CONFLICT (user_id, country) DO
UPDATE
SET city = EXCLUDED.city,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at
RETURNING id INTO v_ambassador_id;
RETURN QUERY
SELECT true,
  v_ambassador_id,
  NULL;
EXCEPTION
WHEN OTHERS THEN RETURN QUERY
SELECT false,
  NULL,
  'INTERNAL_ERROR';
END;
$$;


CREATE OR REPLACE FUNCTION get_user_friends(
    current_user_id uuid,
    limit_count int DEFAULT 100,
    offset_count int DEFAULT 0
  ) RETURNS TABLE (
    user_id uuid,
    display_name text,
    full_name text,
    avatar_url text,
    location text,
    mutual_friends_count bigint
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT p.user_id,
  p.display_name,
  p.full_name,
  p.avatar_url,
  p.location,
  (
    SELECT count(*)::bigint
    FROM friends f1
      JOIN friends f2 ON f1.friend_id = f2.friend_id
    WHERE f1.user_id = current_user_id
      AND f2.user_id = p.user_id
  ) as mutual_friends_count
FROM friends f
  JOIN user_profiles p ON f.friend_id = p.user_id
WHERE f.user_id = current_user_id
LIMIT limit_count OFFSET offset_count;
END;
$$;


CREATE OR REPLACE FUNCTION get_user_requests(
    current_user_id uuid,
    limit_count int DEFAULT 100,
    offset_count int DEFAULT 0
  ) RETURNS TABLE (
    request_id uuid,
    sender_id uuid,
    display_name text,
    full_name text,
    avatar_url text,
    created_at timestamptz,
    mutual_friends_count bigint
  ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT r.id as request_id,
  p.user_id as sender_id,
  p.display_name,
  p.full_name,
  p.avatar_url,
  r.created_at,
  (
    SELECT count(*)::bigint
    FROM friends f1
      JOIN friends f2 ON f1.friend_id = f2.friend_id
    WHERE f1.user_id = current_user_id
      AND f2.user_id = p.user_id
  ) as mutual_friends_count
FROM friend_requests r
  JOIN user_profiles p ON r.sender_id = p.user_id
WHERE r.receiver_id = current_user_id
LIMIT limit_count OFFSET offset_count;
END;
$$;


CREATE OR REPLACE FUNCTION create_founder_welcome_chat(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system_user_id uuid;
  v_chat_id uuid;
  v_template text;
  v_message text;
  v_founder_name text;
BEGIN
  -- 1. Get system user (Team / Founder)
  SELECT system_user_id, display_name
  INTO v_system_user_id, v_founder_name
  FROM system_users
  WHERE display_name = 'Christopher'
  LIMIT 1;

  IF v_system_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Load message template
  SELECT content
  INTO v_template
  FROM system_message_templates
  WHERE key = 'founder_welcome'
  LIMIT 1;

  -- 3. Fallback message
  IF v_template IS NULL THEN
    v_message := 'Welcome to Meetro! 👋 If you need help, just reply here.';
  ELSE
    -- Replace placeholders
    v_message := replace(
      v_template,
      '{{founder_name}}',
      COALESCE(v_founder_name, 'The Meetro Team')
    );
  END IF;

  -- 4. Check if chat already exists
  SELECT c.id
  INTO v_chat_id
  FROM chats c
  JOIN participants p ON p.chat_id = c.id
  WHERE c.system_user_id = v_system_user_id
    AND p.user_id = p_user_id
  LIMIT 1;

  -- 5. Create chat + send message
  IF v_chat_id IS NULL THEN
    INSERT INTO chats (chat_type, system_user_id, is_system_chat)
    VALUES ('direct', v_system_user_id, true)
    RETURNING id INTO v_chat_id;

    INSERT INTO participants (chat_id, user_id)
    VALUES (v_chat_id, p_user_id);

    INSERT INTO messages (
      chat_id,
      system_user_id,
      message,
      message_type
    )
    VALUES (
      v_chat_id,
      v_system_user_id,
      v_message,
      'system'
    );
  END IF;

  -- 6. Add founder/system user as participant
    INSERT INTO participants (chat_id, user_id)
    VALUES (v_chat_id, v_system_user_id);
END;
$$;


CREATE OR REPLACE FUNCTION handle_system_chat_reply()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_system_chat boolean;
BEGIN
  -- Only user messages
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_system_chat
  INTO v_is_system_chat
  FROM chats
  WHERE id = NEW.chat_id;

  IF v_is_system_chat THEN
    INSERT INTO support_tickets (chat_id, user_id, status, updated_at)
    VALUES (NEW.chat_id, NEW.user_id, 'open', now())
    ON CONFLICT (chat_id)
    DO UPDATE SET
      status = 'open',
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION notify_activity_chat_message() RETURNS TRIGGER AS $$
DECLARE
  chat_info RECORD;
  sender_name TEXT;
  recipients JSONB;
  supabase_url text;
  api_key text;
BEGIN
  -- 1. Get chat details (type, title, etc.)
  SELECT c.chat_type,
         CASE
           WHEN c.chat_type IN ('meetup', 'event', 'blend') THEN a.title
           ELSE 'Chat'
         END as title,
         c.id as chat_id,
         c.activity_id,
         c.trip_id
  INTO chat_info
  FROM chats c
  LEFT JOIN activities a ON c.activity_id = a.id
  LEFT JOIN cities ci ON c.trip_id = ci.id
  WHERE c.id = NEW.chat_id;

  -- If not a relevant chat type, exit
  IF chat_info.chat_type NOT IN ('meetup', 'event', 'blend') THEN
    RETURN NEW;
  END IF;

  -- 2. Get sender name
  SELECT display_name INTO sender_name FROM user_profiles WHERE user_id = NEW.user_id;

  -- 3. Get recipients (tokens)
  -- We filter out the sender and check notification preferences
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', p.user_id,
      'token', upt.token
    )
  ) INTO recipients
  FROM participants p
  JOIN user_push_tokens upt ON p.user_id = upt.user_id
  LEFT JOIN user_preferences pref ON p.user_id = pref.user_id
  WHERE p.chat_id = NEW.chat_id
    AND p.user_id != NEW.user_id
    AND (pref.notifications_enabled IS NULL OR pref.notifications_enabled = true);

  -- 4. Call Edge Function if recipients exist
  IF recipients IS NOT NULL AND jsonb_array_length(recipients) > 0 THEN
    -- Fetch secrets
    SELECT value INTO supabase_url FROM secrets WHERE key = 'supabase_url';
    SELECT value INTO api_key FROM secrets WHERE key = 'service_role_key';

    -- Check if secrets exist
    IF supabase_url IS NULL OR api_key IS NULL THEN
      RAISE WARNING 'Missing secrets for notify_activity_chat_message: supabase_url=%, api_key found=%', supabase_url, (api_key IS NOT NULL);
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-activity-chat-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || api_key
      ),
      body := jsonb_build_object(
        'chat_id', chat_info.chat_id,
        'chat_type', chat_info.chat_type,
        'title', chat_info.title,
        'message_body', NEW.message,
        'sender_name', sender_name,
        'sender_id', NEW.user_id,
        'recipients', recipients,
        'data', jsonb_build_object(
            'click_action', 'FLUTTER_NOTIFICATION_CLICK',
            'chat_id', chat_info.chat_id,
            'type', 'activity_chat_message',
            'activity_title', chat_info.title,
            'activity_type', chat_info.chat_type
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION notify_nearby_users() RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
  nearby_users JSONB;
  activity_type TEXT := 'activity';
  supabase_url text;
  api_key text;
BEGIN
  -- Get creator name
  SELECT display_name INTO creator_name FROM user_profiles WHERE user_id = NEW.created_by;
  
  -- Find nearby users (within 50km)
  -- Filter by notification preferences (notifications_enabled AND NOT hide_nearby_distance)
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', up.user_id,
      'token', upt.token,
      'distance_km', (ST_Distance(
          up.geo_location,
          ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography
      ) / 1000)
    )
  ) INTO nearby_users
  FROM user_profiles up
  JOIN user_push_tokens upt ON up.user_id = upt.user_id
  LEFT JOIN user_preferences pref ON up.user_id = pref.user_id
  WHERE up.user_id != NEW.created_by
    AND ST_DWithin(
        up.geo_location,
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
        50000 -- 50km radius
    )
    AND (pref.notifications_enabled IS NULL OR pref.notifications_enabled = true);

  -- Call Edge Function if nearby users exist
  IF nearby_users IS NOT NULL AND jsonb_array_length(nearby_users) > 0 THEN
    -- Fetch secrets
    SELECT value INTO supabase_url FROM secrets WHERE key = 'supabase_url';
    SELECT value INTO api_key FROM secrets WHERE key = 'service_role_key';

    -- Check if secrets exist
    IF supabase_url IS NULL OR api_key IS NULL THEN
      RAISE WARNING 'Missing secrets for notify_nearby_users: supabase_url=%, api_key found=%', supabase_url, (api_key IS NOT NULL);
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-nearby-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || api_key
      ),
      body := jsonb_build_object(
        'activity_id', NEW.id,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'creator_id', NEW.created_by,
        'nearby_users', nearby_users,
        'activity_title', NEW.title,
        'activity_type', activity_type,
        'creator_name', creator_name,
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


create or replace function notify_telegram_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  supabase_url text;
  api_key text;
begin
  -- Fetch secrets
  select value into supabase_url from secrets where key = 'supabase_url';
  select value into api_key from secrets where key = 'service_role_key';

  -- Check if secrets exist
  if supabase_url is null or api_key is null then
    raise warning 'Missing secrets for notify_telegram_new_user: supabase_url=%, api_key found=%', supabase_url, (api_key is not null);
    return new;
  end if;

  begin
    perform
      net.http_post(
        url := supabase_url || '/functions/v1/notify-telegram',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || api_key
        ),
        body := jsonb_build_object(
          'id', new.user_id,
          'email', new.email,
          'provider', new.auth_provider,
          'full_name', new.full_name,
          'country_of_origin', new.country_of_origin,
          'display_name', new.display_name,
          'created_at', new.created_at
        )
      );
  exception when others then
    raise warning 'Failed to send telegram notification: %', SQLERRM;
  end;

  return new;
end;
$$;


create or replace function public.get_nearby_clients(
    p_user_latitude double precision,
    p_user_longitude double precision,
    p_radius_meters double precision default 5000,
    p_limit_count int default 100
)
returns table (
    id uuid,
    name text,
    latitude double precision,
    longitude double precision,
    logo_url text,
    type text,
    description text,
    image_url text[],
    address text,
    website_url text,
    instagram_url text,
    contact_number text,
    email text,
    rating double precision,
    distance_meters double precision,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
language sql
stable
security definer
as $$
select
    c.id,
    c.name,
    c.latitude::double precision,
    c.longitude::double precision,
    c.logo_url,
    c.type,
    c.description,
    c.image_url,
    c.address,
    c.website_url,
    c.instagram_url,
    c.contact_number,
    c.email,
    c.rating::double precision,
    ST_Distance(
        c.geo_location,
        ST_SetSRID(ST_MakePoint(p_user_longitude, p_user_latitude), 4326)::geography
    ) as distance_meters,
    c.created_at,
    c.updated_at
from clients c
where ST_DWithin(
    c.geo_location,
    ST_SetSRID(ST_MakePoint(p_user_longitude, p_user_latitude), 4326)::geography,
    p_radius_meters
)
order by distance_meters asc
limit p_limit_count;
$$;

CREATE OR REPLACE FUNCTION public.get_user_analytics(
    date_range text DEFAULT 'month'
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'new_users_today', (SELECT new_users_today FROM view_user_analytics_overview),
        'new_users_this_week', (SELECT new_users_this_week FROM view_user_analytics_overview),
        'new_users_this_month', (SELECT new_users_this_month FROM view_user_analytics_overview),
        'user_retention_rate', COALESCE((SELECT AVG(retention_rate) FROM view_user_retention_analytics), 0),
        'user_growth_data', (
            SELECT json_agg(
                json_build_object(
                    'label', label,
                    'value', value
                ) ORDER BY date
            )
            FROM user_growth_chart_data
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_analytics_overview(
    date_range text DEFAULT 'month',
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL
)
RETURNS TABLE (
    total_users bigint,
    active_users bigint,
    total_subscriptions bigint,
    total_reports bigint
) AS $$
DECLARE
    filter_start_date date;
    filter_end_date date;
BEGIN
    -- Set date range based on parameter
    CASE date_range
        WHEN 'today' THEN
            filter_start_date := CURRENT_DATE;
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'week' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '7 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'month' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '30 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'quarter' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '90 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'year' THEN
            filter_start_date := CURRENT_DATE - INTERVAL '365 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
        WHEN 'custom' THEN
            filter_start_date := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
            filter_end_date := COALESCE(end_date, CURRENT_DATE + INTERVAL '1 day');
        ELSE
            filter_start_date := CURRENT_DATE - INTERVAL '30 days';
            filter_end_date := CURRENT_DATE + INTERVAL '1 day';
    END CASE;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_profiles)::bigint AS total_users,
        (SELECT COUNT(*) FROM user_profiles WHERE status = 'active')::bigint AS active_users,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND created_at BETWEEN filter_start_date AND filter_end_date)::bigint AS total_subscriptions,
        (SELECT COUNT(*) FROM user_reports WHERE created_at BETWEEN filter_start_date AND filter_end_date)::bigint AS total_reports;
END;
$$ LANGUAGE plpgsql;


    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN (VALUES
      ('public','accept_friend_request'),
      ('public','calculate_user_trust_score'),
      ('public','cancel_friend_request'),
      ('public','cleanup_verification_images_30_days'),
      ('public','create_activity'),
      ('public','create_direct_message'),
      ('public','create_founder_welcome_chat'),
      ('public','create_message'),
      ('public','create_user_report'),
      ('public','decline_friend_request'),
      ('public','delete_activity'),
      ('public','delete_message'),
      ('public','delete_or_leave_chat'),
      ('public','delete_trip'),
      ('public','get_activities_in_bounds'),
      ('public','get_activities_map'),
      ('public','get_activity_details'),
      ('public','get_chat'),
      ('public','get_chat_participants'),
      ('public','get_chat_screen'),
      ('public','get_chat_unread_count'),
      ('public','get_clients_in_bounds'),
      ('public','get_fellow_travelers'),
      ('public','get_group_details'),
      ('public','get_marketing_stats'),
      ('public','get_nearby_clients'),
      ('public','get_nearby_travellers'),
      ('public','get_nearby_users'),
      ('public','get_participant_rsvp_status'),
      ('public','get_reel_activities'),
      ('public','get_total_unread_count'),
      ('public','get_trip_details_by_id'),
      ('public','get_user_activities'),
      ('public','get_user_chats'),
      ('public','get_user_chats_mvp'),
      ('public','get_user_friends'),
      ('public','get_user_preferences'),
      ('public','get_user_profile'),
      ('public','get_user_reference_stats'),
      ('public','get_user_references'),
      ('public','get_user_requests'),
      ('public','get_users_by_phone_numbers'),
      ('public','handle_system_chat_reply'),
      ('public','is_admin'),
      ('public','is_email_available'),
      ('public','is_instagram_tag_available'),
      ('public','is_linkedin_tag_available'),
      ('public','is_user_profile_complete'),
      ('public','join_activity'),
      ('public','join_chat'),
      ('public','join_direct_chat'),
      ('public','leave_activity'),
      ('public','leave_chat'),
      ('public','make_user_local_ambassador'),
      ('public','mark_chat_as_read'),
      ('public','mark_reel_activities_viewed'),
      ('public','message_local_ambassador'),
      ('public','notify_activity_chat_message'),
      ('public','notify_nearby_users'),
      ('public','notify_new_friend_request'),
      ('public','notify_telegram_new_user'),
      ('public','register_user'),
      ('public','search_users_by_name'),
      ('public','send_friend_request'),
      ('public','touch_user_device'),
      ('public','unfriend'),
      ('public','update_activity'),
      ('public','update_participant_rsvp'),
      ('public','update_referral_source'),
      ('public','update_user_location'),
      ('public','update_user_preferences'),
      ('public','update_user_profile')
      ('public','get_analytics_overview'),
      ('public','get_user_analytics')
    ) AS t(nsp, proname)
      ON t.nsp = n.nspname AND t.proname = p.proname
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      r.nspname, r.proname, pg_get_function_identity_arguments(r.oid));
  END LOOP;
END $$;
    `);
  }
}


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

ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- =============================================
-- 7. SUBSCRIPTIONS & PLANS
-- =============================================
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

ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
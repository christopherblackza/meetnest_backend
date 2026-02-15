import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsViews1707921000007 implements MigrationInterface {
  name = 'AddAnalyticsViews1707921000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 4. Create User Analytics Overview View
    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.view_user_analytics_overview WITH (security_invoker = true) AS
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
            ROUND(
                (
                    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::numeric /
                    NULLIF(
                        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days' 
                                  AND created_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END), 
                        0
                    ) - 1
                ) * 100, 
                2
            ) as growth_rate
        FROM user_profiles;
    `);

    // 5. Create User Retention Analytics View
    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.view_user_retention_analytics WITH (security_invoker = true) AS
        WITH user_cohorts AS (
            SELECT 
                user_id,
                DATE_TRUNC('month', created_at) as cohort_month,
                created_at
            FROM user_profiles
        ),
        user_activities AS (
            SELECT DISTINCT
                user_id,
                DATE_TRUNC('month', created_at) as activity_month
            FROM (
                SELECT created_by as user_id, created_at FROM activities WHERE created_by IS NOT NULL
            ) activities
        )
        SELECT 
            uc.cohort_month,
            COUNT(DISTINCT uc.user_id) as cohort_size,
            COUNT(DISTINCT CASE WHEN ua.activity_month = uc.cohort_month + INTERVAL '1 month' THEN uc.user_id END) as month_1_retained,
            ROUND(
                (
                    COUNT(DISTINCT CASE WHEN ua.activity_month = uc.cohort_month + INTERVAL '1 month' THEN uc.user_id END)::numeric /
                    NULLIF(COUNT(DISTINCT uc.user_id), 0)
                ) * 100, 
                2
            ) as retention_rate
        FROM user_cohorts uc
        LEFT JOIN user_activities ua ON uc.user_id = ua.user_id
        WHERE uc.cohort_month >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY uc.cohort_month
        ORDER BY uc.cohort_month;
    `);

    // 6. Create Revenue Analytics View
    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.view_revenue_analytics_overview WITH (security_invoker = true) AS 
      SELECT 
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END), 0)::float / 100 as total_revenue, 
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE THEN p.amount_cents END), 0)::float / 100 as daily_revenue, 
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN p.amount_cents END), 0)::float / 100 as weekly_revenue, 
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0)::float / 100 as monthly_revenue, 
          COUNT(DISTINCT s.id) as total_subscriptions, 
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions, 
          ROUND( 
              ( 
                  COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0)::numeric / 
                  NULLIF(COALESCE(SUM(CASE WHEN p.status = 'succeeded' AND p.created_at >= CURRENT_DATE - INTERVAL '60 days' AND p.created_at < CURRENT_DATE - INTERVAL '30 days' THEN p.amount_cents END), 0), 0) 
              - 1) * 100, 
              2 
          ) as revenue_growth_rate, 
          ROUND( 
              ( 
                  COUNT(CASE WHEN s.status = 'canceled' AND s.end_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::numeric / 
                  NULLIF(COUNT(CASE WHEN s.status IN ('active', 'canceled') THEN 1 END), 0) 
              ) * 100, 
              2 
          ) as churn_rate 
      FROM public.subscriptions s 
      LEFT JOIN public.payments p ON p.subscription_id = s.id;
    `);

    // 7. Create Revenue Chart Data View
    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.view_revenue_chart_data WITH (security_invoker = true) AS
      SELECT 
      DATE_TRUNC('day', p.created_at) as date,
      TO_CHAR(DATE_TRUNC('day', p.created_at), 'Mon DD') as label,
      COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END), 0)::float / 100 as value
      FROM payments p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', p.created_at)
      ORDER BY date;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP VIEW IF EXISTS public.view_revenue_chart_data;
      DROP VIEW IF EXISTS public.view_revenue_analytics_overview;
      DROP VIEW IF EXISTS public.view_user_retention_analytics;
      DROP VIEW IF EXISTS public.view_user_analytics_overview;
      DROP VIEW IF EXISTS public.view_content_analytics_overview;
      -- We do not drop table payments as it might contain data
    `);
  }
}

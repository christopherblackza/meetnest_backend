export interface AnalyticsOverview {
  total_users: number;
  active_users: number;
  total_revenue: number;
  total_subscriptions: number;
  growth_rate: number;
  churn_rate: number;
  new_users_7d: number;
  new_users_30d: number;
  total_reports: number;
  reports_opened: number;
  reports_resolved: number;
  meetups_created: number;
  events_created: number;
  // Optional fields that might be returned
  active_paid_users?: number;
  churned_subscriptions?: number;
  total_attendees?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface UserAnalytics {
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  user_retention_rate: number;
  user_growth_data: ChartDataPoint[];
}

export interface RevenueAnalytics {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  revenue_growth_rate: number;
  revenue_chart_data: ChartDataPoint[];
}

export interface ContentAnalytics {
  total_meetups: number;
  total_events: number;
  total_chats: number;
  content_engagement_rate: number;
}

export interface AnalyticsFilters {
  date_range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  start_date?: string;
  end_date?: string;
  metric_type: 'overview' | 'users' | 'revenue' | 'content';
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  data_type: 'overview' | 'users' | 'revenue' | 'content';
  date_range: string;
}

export interface GeographicData {
  country: string;
  city: string;
  user_count: number;
  new_users_this_month: number;
}

export interface PopularInterest {
  name: string;
  emoticon: string;
  user_count: number;
  percentage: number;
}
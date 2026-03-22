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
  blends_created?: number;
  total_activities?: number;
  total_friends?: number;
  messages_period?: number;
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
  total_users?: number;
  active_users?: number;
  active_7d?: number;
  user_retention_rate: number;
  growth_rate?: number;
  avg_hours_to_first_join?: number;
  avg_hours_to_first_create?: number;
  user_growth_data: ChartDataPoint[];
  by_role?: { role: string; count: number }[];
  by_status?: { status: string; count: number }[];
}

export interface RevenueAnalytics {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  revenue_growth_rate: number;
  total_subscriptions?: number;
  active_subscriptions?: number;
  revenue_chart_data: ChartDataPoint[];
}

export interface ContentAnalytics {
  total_meetups: number;
  total_events: number;
  total_blends?: number;
  total_chats: number;
  total_messages?: number;
  new_messages_period?: number;
  new_activities_period?: number;
  active_participants?: number;
  content_engagement_rate: number;
  daily_activity_data?: { label: string; blends: number }[];
  top_activities?: { title: string; type: string; participants: number }[];
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

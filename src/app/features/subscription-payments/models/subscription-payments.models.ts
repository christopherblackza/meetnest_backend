export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user_profile?: any;
  plan?: Plan;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user_profile?: any;
  subscription?: Subscription;
}

export interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  total_revenue: number;
  monthly_revenue: number;
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  refunded_payments: number;
  popular_plans: Plan[];
  revenue_by_plan: { plan: Plan; revenue: number; subscribers: number }[];
}

export interface SubscriptionFilters {
  search?: string;
  plan_id?: string;
  status?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  user_id?: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
  payments: number;
}
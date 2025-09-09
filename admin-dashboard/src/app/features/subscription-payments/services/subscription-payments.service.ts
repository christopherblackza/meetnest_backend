import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  Plan,
  Subscription,
  Payment,
  SubscriptionStats,
  SubscriptionFilters,
  RevenueData
} from '../models/subscription-payments.models';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionPaymentsService {
  constructor(private supabase: SupabaseService) {}

  // Plans Management
  getPlans(filters?: SubscriptionFilters): Observable<Plan[]> {
    return from(this.fetchPlans(filters));
  }

  private async fetchPlans(filters?: SubscriptionFilters): Promise<Plan[]> {
    let query = this.supabase.client
      .from('plans')
      .select('*')
      .order('price');

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  createPlan(plan: Partial<Plan>): Observable<Plan> {
    return from(this.insertPlan(plan));
  }

  private async insertPlan(plan: Partial<Plan>): Promise<Plan> {
    const { data, error } = await this.supabase.client
      .from('plans')
      .insert([plan])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  updatePlan(id: string, updates: Partial<Plan>): Observable<Plan> {
    return from(this.modifyPlan(id, updates));
  }

  private async modifyPlan(id: string, updates: Partial<Plan>): Promise<Plan> {
    const { data, error } = await this.supabase.client
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  updatePlanStatus(id: string, is_active: boolean): Observable<Plan> {
    return from(this.modifyPlanStatus(id, is_active));
  }

  private async modifyPlanStatus(id: string, is_active: boolean): Promise<Plan> {
    const { data, error } = await this.supabase.client
      .from('plans')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Subscriptions Management
  getSubscriptions(filters?: SubscriptionFilters): Observable<Subscription[]> {
    return from(this.fetchSubscriptions(filters));
  }

  private async fetchSubscriptions(filters?: SubscriptionFilters): Promise<Subscription[]> {
    let query = this.supabase.client
      .from('subscriptions')
      .select(`
        *,
        user_profile:user_profiles(display_name, email, avatar_url),
        plan:plans(name, price, currency, duration_months)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.plan_id) {
      query = query.eq('plan_id', filters.plan_id);
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  updateSubscriptionStatus(id: string, status: string): Observable<Subscription> {
    return from(this.modifySubscriptionStatus(id, status));
  }

  private async modifySubscriptionStatus(id: string, status: string): Promise<Subscription> {
    const { data, error } = await this.supabase.client
      .from('subscriptions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Payments Management
  getPayments(filters?: SubscriptionFilters): Observable<Payment[]> {
    return from(this.fetchPayments(filters));
  }

  private async fetchPayments(filters?: SubscriptionFilters): Promise<Payment[]> {
    let query = this.supabase.client
      .from('payments')
      .select(`
        *,
        user_profile:user_profiles(display_name, email, avatar_url),
        subscription:subscriptions(id, plan:plans(name))
      `)
      .order('created_at', { ascending: false });

    if (filters?.payment_status) {
      query = query.eq('status', filters.payment_status);
    }

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  updatePaymentStatus(id: string, status: string): Observable<Payment> {
    return from(this.modifyPaymentStatus(id, status));
  }

  private async modifyPaymentStatus(id: string, status: string): Promise<Payment> {
    const { data, error } = await this.supabase.client
      .from('payments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Statistics and Analytics
  getSubscriptionStats(): Observable<SubscriptionStats> {
    return from(this.fetchSubscriptionStats());
  }

  private async fetchSubscriptionStats(): Promise<SubscriptionStats> {
    // Get subscription counts by status
    const [totalSubs, activeSubs, cancelledSubs, expiredSubs] = await Promise.all([
      this.supabase.client.from('subscriptions').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      this.supabase.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      this.supabase.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired')
    ]);

    // Get payment statistics
    const [totalPayments, successfulPayments, failedPayments, refundedPayments] = await Promise.all([
      this.supabase.client.from('payments').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      this.supabase.client.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      this.supabase.client.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'refunded')
    ]);

    // Calculate total revenue
    const { data: revenueData } = await this.supabase.client
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
    const { data: monthlyRevenueData } = await this.supabase.client
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', firstDayOfMonth);

    const monthlyRevenue = monthlyRevenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Get popular plans
    const { data: popularPlansData } = await this.supabase.client
      .from('plans')
      .select(`
        *,
        subscriptions!inner(count)
      `)
      .eq('is_active', true)
      .order('subscriptions.count', { ascending: false })
      .limit(5);

    // Get revenue by plan
    const { data: revenueByPlanData } = await this.supabase.client
      .from('payments')
      .select(`
        amount,
        subscription:subscriptions(plan:plans(*))
      `)
      .eq('status', 'completed');

    const revenueByPlan = this.calculateRevenueByPlan(revenueByPlanData || []);

    return {
      total_subscriptions: totalSubs.count || 0,
      active_subscriptions: activeSubs.count || 0,
      cancelled_subscriptions: cancelledSubs.count || 0,
      expired_subscriptions: expiredSubs.count || 0,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      total_payments: totalPayments.count || 0,
      successful_payments: successfulPayments.count || 0,
      failed_payments: failedPayments.count || 0,
      refunded_payments: refundedPayments.count || 0,
      popular_plans: popularPlansData || [],
      revenue_by_plan: revenueByPlan
    };
  }

  private calculateRevenueByPlan(paymentData: any[]): { plan: Plan; revenue: number; subscribers: number }[] {
    const planRevenue = new Map<string, { plan: Plan; revenue: number; subscribers: Set<string> }>();

    paymentData.forEach(payment => {
      if (payment.subscription?.plan) {
        const planId = payment.subscription.plan.id;
        const existing = planRevenue.get(planId);
        
        if (existing) {
          existing.revenue += payment.amount;
          existing.subscribers.add(payment.subscription.user_id);
        } else {
          planRevenue.set(planId, {
            plan: payment.subscription.plan,
            revenue: payment.amount,
            subscribers: new Set([payment.subscription.user_id])
          });
        }
      }
    });

    return Array.from(planRevenue.values())
      .map(item => ({
        plan: item.plan,
        revenue: item.revenue,
        subscribers: item.subscribers.size
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // Revenue Analytics
  getRevenueData(period: 'week' | 'month' | 'year' = 'month'): Observable<RevenueData[]> {
    return from(this.fetchRevenueData(period));
  }

  private async fetchRevenueData(period: 'week' | 'month' | 'year'): Promise<RevenueData[]> {
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        dateFormat = 'YYYY-MM';
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 4, 0, 1);
        dateFormat = 'YYYY';
        break;
    }

    const { data: revenueData } = await this.supabase.client
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    const { data: subscriptionData } = await this.supabase.client
      .from('subscriptions')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    return this.aggregateRevenueData(revenueData || [], subscriptionData || [], period);
  }

  private aggregateRevenueData(payments: any[], subscriptions: any[], period: string): RevenueData[] {
    const dataMap = new Map<string, { revenue: number; subscriptions: number; payments: number }>();

    // Process payments
    payments.forEach(payment => {
      const date = this.formatDateByPeriod(payment.created_at, period);
      const existing = dataMap.get(date) || { revenue: 0, subscriptions: 0, payments: 0 };
      existing.revenue += payment.amount;
      existing.payments += 1;
      dataMap.set(date, existing);
    });

    // Process subscriptions
    subscriptions.forEach(subscription => {
      const date = this.formatDateByPeriod(subscription.created_at, period);
      const existing = dataMap.get(date) || { revenue: 0, subscriptions: 0, payments: 0 };
      existing.subscriptions += 1;
      dataMap.set(date, existing);
    });

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        subscriptions: data.subscriptions,
        payments: data.payments
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private formatDateByPeriod(dateString: string, period: string): string {
    const date = new Date(dateString);
    switch (period) {
      case 'week':
        return date.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'year':
        return String(date.getFullYear());
      default:
        return dateString;
    }
  }

  // Export functionality
  exportSubscriptions(filters?: SubscriptionFilters): Observable<Blob> {
    return from(this.generateSubscriptionsExport(filters));
  }

  private async generateSubscriptionsExport(filters?: SubscriptionFilters): Promise<Blob> {
    const subscriptions = await this.fetchSubscriptions(filters);
    const csvContent = this.convertSubscriptionsToCSV(subscriptions);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private convertSubscriptionsToCSV(subscriptions: Subscription[]): string {
    const headers = ['ID', 'User', 'Plan', 'Status', 'Start Date', 'End Date', 'Auto Renew', 'Created At'];
    const rows = subscriptions.map(sub => [
      sub.id,
      sub.user_profile?.display_name || 'Unknown',
      sub.plan?.name || 'Unknown',
      sub.status,
      sub.start_date,
      sub.end_date,
      sub.auto_renew ? 'Yes' : 'No',
      sub.created_at
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}
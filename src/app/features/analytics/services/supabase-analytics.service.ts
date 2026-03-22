import { Injectable } from '@angular/core';
import { AnalyticsService } from './analytics.service.base';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  AnalyticsOverview,
  UserAnalytics,
  RevenueAnalytics,
  ContentAnalytics,
  GeographicData,
  PopularInterest,
  AnalyticsFilters,
  ExportOptions
} from '../models/analytics.models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseAnalyticsService extends AnalyticsService {
  constructor(private supabase: SupabaseService) {
    super();
  }

  getAnalyticsOverview(filters: AnalyticsFilters): Observable<AnalyticsOverview> {
    return from(
      this.supabase.client.rpc('get_analytics_overview', {
        p_date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as AnalyticsOverview;
      }),
      catchError((err) => {
        console.error('Error fetching analytics overview:', err);
        return of(this.emptyOverview());
      })
    );
  }

  getUserAnalytics(filters: AnalyticsFilters): Observable<UserAnalytics> {
    return from(
      this.supabase.client.rpc('get_user_analytics', {
        p_date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as UserAnalytics;
      }),
      catchError((err) => {
        console.error('Error fetching user analytics:', err);
        return of({
          new_users_today: 0,
          new_users_this_week: 0,
          new_users_this_month: 0,
          user_retention_rate: 0,
          user_growth_data: []
        });
      })
    );
  }

  getRevenueAnalytics(filters: AnalyticsFilters): Observable<RevenueAnalytics> {
    return from(
      this.supabase.client.rpc('get_revenue_analytics', {
        p_date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as RevenueAnalytics;
      }),
      catchError((err) => {
        console.error('Error fetching revenue analytics:', err);
        return of({
          daily_revenue: 0,
          weekly_revenue: 0,
          monthly_revenue: 0,
          revenue_growth_rate: 0,
          revenue_chart_data: []
        });
      })
    );
  }

  getContentAnalytics(filters: AnalyticsFilters): Observable<ContentAnalytics> {
    return from(
      this.supabase.client.rpc('get_content_analytics', {
        p_date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as ContentAnalytics;
      }),
      catchError((err) => {
        console.error('Error fetching content analytics:', err);
        return of({
          total_meetups: 0,
          total_events: 0,
          total_chats: 0,
          content_engagement_rate: 0
        });
      })
    );
  }

  getGeographicAnalytics(): Observable<GeographicData[]> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .select('current_country, current_city')
        .not('current_country', 'is', null)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const grouped = (data || []).reduce((acc: Record<string, GeographicData>, row: any) => {
          const key = `${row.current_country}|${row.current_city || 'Unknown'}`;
          if (!acc[key]) {
            acc[key] = { country: row.current_country, city: row.current_city || 'Unknown', user_count: 0, new_users_this_month: 0 };
          }
          acc[key].user_count++;
          return acc;
        }, {});
        return Object.values(grouped).sort((a, b) => b.user_count - a.user_count);
      }),
      catchError(() => of([]))
    );
  }

  getPopularInterests(): Observable<PopularInterest[]> {
    return from(
      this.supabase.client
        .from('user_interests')
        .select('interest_id, interests(name, emoticon)')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const grouped = (data || []).reduce((acc: Record<string, any>, row: any) => {
          const id = row.interest_id;
          if (!acc[id]) {
            acc[id] = { name: row.interests?.name || 'Unknown', emoticon: row.interests?.emoticon || '', user_count: 0, percentage: 0 };
          }
          acc[id].user_count++;
          return acc;
        }, {});
        const results = Object.values(grouped) as PopularInterest[];
        const total = results.reduce((s, r) => s + r.user_count, 0);
        return results
          .map(r => ({ ...r, percentage: total > 0 ? Math.round((r.user_count / total) * 100) : 0 }))
          .sort((a, b) => b.user_count - a.user_count)
          .slice(0, 10);
      }),
      catchError(() => of([]))
    );
  }

  exportData(options: ExportOptions): Observable<Blob> {
    const filters: AnalyticsFilters = { date_range: options.date_range as any, metric_type: options.data_type };

    let data$: Observable<any>;
    switch (options.data_type) {
      case 'users': data$ = this.getUserAnalytics(filters); break;
      case 'revenue': data$ = this.getRevenueAnalytics(filters); break;
      case 'content': data$ = this.getContentAnalytics(filters); break;
      default: data$ = this.getAnalyticsOverview(filters);
    }

    return data$.pipe(
      map(data => {
        const content = JSON.stringify(data, null, 2);
        return new Blob([content], { type: 'application/json' });
      })
    );
  }

  private emptyOverview(): AnalyticsOverview {
    return {
      total_users: 0, active_users: 0, total_revenue: 0, total_subscriptions: 0,
      growth_rate: 0, churn_rate: 0, new_users_7d: 0, new_users_30d: 0,
      total_reports: 0, reports_opened: 0, reports_resolved: 0,
      meetups_created: 0, events_created: 0, total_attendees: 0
    };
  }
}

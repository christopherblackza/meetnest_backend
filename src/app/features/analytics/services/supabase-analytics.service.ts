import { Injectable } from '@angular/core';
import { AnalyticsService } from './analytics.service.base';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable, from, forkJoin, of } from 'rxjs';
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
    // Implement direct queries to replace NestJS endpoint
    // This is a simplified implementation aggregating data from tables
    const userCount$ = from(this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }));
    const activeUserCount$ = from(this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'));
    const reportCount$ = from(this.supabase.client.from('user_reports').select('*', { count: 'exact', head: true }));
    const activityCount$ = from(this.supabase.client.from('activities').select('*', { count: 'exact', head: true }));
    
    // For a real implementation, we would need more complex queries or an RPC
    // Here we return a basic overview
    return forkJoin({
      totalUsers: userCount$,
      activeUsers: activeUserCount$,
      reports: reportCount$,
      activities: activityCount$
    }).pipe(
      map(results => ({
        total_users: results.totalUsers.count || 0,
        active_users: results.activeUsers.count || 0,
        total_revenue: 0, // Placeholder
        total_reports: results.reports.count || 0,
        total_subscriptions: 0, // Placeholder
        growth_rate: 0,
        churn_rate: 0,
        new_users_7d: 0,
        new_users_30d: 0,
        active_paid_users: 0,
        churned_subscriptions: 0,
        meetups_created: results.activities.count || 0, // Simplified
        events_created: 0,
        total_attendees: 0,
        reports_opened: results.reports.count || 0,
        reports_resolved: 0
      }))
    );
  }

  getUserAnalytics(filters: AnalyticsFilters): Observable<UserAnalytics> {
    return from(
      this.supabase.client.rpc('get_user_analytics', {
        date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as UserAnalytics;
      })
    );
  }

  getRevenueAnalytics(filters: AnalyticsFilters): Observable<RevenueAnalytics> {
    return from(
      this.supabase.client.rpc('get_revenue_analytics', {
        date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as RevenueAnalytics;
      })
    );
  }

  getContentAnalytics(filters: AnalyticsFilters): Observable<ContentAnalytics> {
    return from(
      this.supabase.client.rpc('get_content_analytics', {
        date_range: filters.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as ContentAnalytics;
      })
    );
  }

  getGeographicAnalytics(): Observable<GeographicData[]> {
    return from(
      this.supabase.client.rpc('get_geographic_analytics')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as GeographicData[];
      })
    );
  }

  getPopularInterests(): Observable<PopularInterest[]> {
    return from(
      this.supabase.client.rpc('get_popular_interests')
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as PopularInterest[];
      })
    );
  }

  exportData(options: ExportOptions): Observable<Blob> {
    return from(
      this.supabase.client.rpc('export_analytics_data', {
        export_format: 'json',
        data_type: options.data_type,
        date_range: options.date_range
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const content = JSON.stringify(data, null, 2);
        return new Blob([content], { type: 'application/json' });
      })
    );
  }
}

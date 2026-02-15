import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AnalyticsService } from './analytics.service.base';
import { environment } from '../../../../environments/environment';
import {
  AnalyticsOverview,
  UserAnalytics,
  RevenueAnalytics,
  ContentAnalytics,
  AnalyticsFilters,
  ExportOptions,
  GeographicData,
  PopularInterest
} from '../models/analytics.models';

@Injectable({
  providedIn: 'root'
})
export class NestAnalyticsService extends AnalyticsService {
  constructor(
    private supabase: SupabaseService,
    private http: HttpClient
  ) {
    super();
  }

  getAnalyticsOverview(filters: AnalyticsFilters): Observable<AnalyticsOverview> {
    let params = new HttpParams();
    if (filters.date_range) params = params.set('date_range', filters.date_range);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);

    return this.http.get<AnalyticsOverview>(`${environment.nestApiUrl}/users/analytics/overview`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching analytics overview:', error);
        throw error;
      })
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
      }),
      catchError(error => {
        console.error('Error fetching user analytics:', error);
        throw error;
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
      }),
      catchError(error => {
        console.error('Error fetching revenue analytics:', error);
        throw error;
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
      }),
      catchError(error => {
        console.error('Error fetching content analytics:', error);
        throw error;
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
      }),
      catchError(error => {
        console.error('Error fetching geographic analytics:', error);
        throw error;
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
      }),
      catchError(error => {
        console.error('Error fetching popular interests:', error);
        throw error;
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
        
        // Convert JSON data to the requested format
        let content: string;
        let mimeType: string;
        let filename: string;
        
        switch (options.format) {
          case 'csv':
            content = this.convertToCSV(data);
            mimeType = 'text/csv';
            filename = `analytics-${Date.now()}.csv`;
            break;
          case 'excel':
            // For Excel, we'll use CSV format as a simple implementation
            content = this.convertToCSV(data);
            mimeType = 'application/vnd.ms-excel';
            filename = `analytics-${Date.now()}.xls`;
            break;
          default:
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            filename = `analytics-${Date.now()}.json`;
        }
        
        return new Blob([content], { type: mimeType });
      }),
      catchError(error => {
        console.error('Error exporting data:', error);
        throw error;
      })
    );
  }

  private convertToCSV(data: any): string {
    if (!data) return '';
    
    // Simple CSV conversion - you might want to use a proper CSV library
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : value
    ).join(',');
    
    return `${headers}\n${values}`;
  }
}
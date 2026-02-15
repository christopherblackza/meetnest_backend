import { Observable } from 'rxjs';
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

export abstract class AnalyticsService {
  abstract getAnalyticsOverview(filters: AnalyticsFilters): Observable<AnalyticsOverview>;
  abstract getUserAnalytics(filters: AnalyticsFilters): Observable<UserAnalytics>;
  abstract getRevenueAnalytics(filters: AnalyticsFilters): Observable<RevenueAnalytics>;
  abstract getContentAnalytics(filters: AnalyticsFilters): Observable<ContentAnalytics>;
  abstract getGeographicAnalytics(): Observable<GeographicData[]>;
  abstract getPopularInterests(): Observable<PopularInterest[]>;
  abstract exportData(options: ExportOptions): Observable<Blob>;
}

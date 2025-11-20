import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserReport, ContentFlag, ModerationAction, ModerationStats, ModerationFilters } from '../models/moderation.models';

@Injectable({
  providedIn: 'root'
})
export class ContentModerationService {
  private supabase = inject(SupabaseService);

  // User Reports
  getReports(filters?: ModerationFilters): Observable<UserReport[]> {
    return from(this.fetchReports(filters));
  }

  private async fetchReports(filters?: ModerationFilters): Promise<UserReport[]> {
    let query = this.supabase.client
      .from('user_reports')
      .select(`
        *,
        reporter:reporter_id(full_name, display_name, avatar_url, email),
        reported_user:reported_id(full_name, display_name, avatar_url, email, status)
      `);


    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('report_type', filters.type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    console.log('REPORTS', data);

    if (error) throw error;
    return data || [];
  }

  updateReportStatus(reportId: string, status: string): Observable<boolean> {
    return from(this.updateReport(reportId, status));
  }

  private async updateReport(reportId: string, status: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('user_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reportId);
    
    return !error;
  }


 

  // Moderation Actions
  getModerationActions(userId?: string): Observable<ModerationAction[]> {
    return from(this.fetchModerationActions(userId));
  }

  private async fetchModerationActions(userId?: string): Promise<ModerationAction[]> {
    let query = this.supabase.client
      .from('moderation_actions')
      .select(`
        *,
        moderator:moderator_id(full_name, email),
        target_user:target_user_id(full_name, email)
      `);

    if (userId) {
      query = query.eq('target_user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  createModerationAction(action: Partial<ModerationAction>): Observable<boolean> {
    return from(this.addModerationAction(action));
  }

  private async addModerationAction(action: Partial<ModerationAction>): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('moderation_actions')
      .insert([{
        ...action,
        created_at: new Date().toISOString()
      }]);
    
    return !error;
  }

  // Content Flags
  getContentFlags(filters?: ModerationFilters): Observable<ContentFlag[]> {
    return from(this.fetchContentFlags(filters));
  }

  private async fetchContentFlags(filters?: ModerationFilters): Promise<ContentFlag[]> {
    let query = this.supabase.client
      .from('content_flags')
      .select(`
        *,
        user:user_id(full_name, display_name, avatar_url, email)
      `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('flag_type', filters.type);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  updateFlagStatus(flagId: string, status: string): Observable<boolean> {
    return from(this.updateFlag(flagId, status));
  }

  private async updateFlag(flagId: string, status: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('content_flags')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', flagId);
    
    return !error;
  }

  // Statistics
  getModerationStats(): Observable<ModerationStats> {
    return from(this.fetchModerationStats());
  }

  private async fetchModerationStats(): Promise<ModerationStats> {
    const [reportsResult, actionsResult] = await Promise.all([
      this.supabase.client.from('user_reports').select('status, reason, created_at'),
      this.supabase.client.from('moderation_actions').select('created_at')
    ]);

    const reports = reportsResult.data || [];
    const actions = actionsResult.data || [];

    const today = new Date().toISOString().split('T')[0];
    const resolvedToday = [...reports].filter(item => 
      item.status === 'resolved' && item.created_at?.startsWith(today)
    ).length;

    return {
      pending_reports: reports.filter(r => r.status === 'pending').length,
      resolved_today: resolvedToday,
      total_actions: actions.length,
      reports_by_type: this.groupByType(reports, 'report_type'),
    };
  }

  private groupByType(items: any[], typeField: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const type = item[typeField] || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }
}
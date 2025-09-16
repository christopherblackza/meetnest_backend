import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserProfile, UserReport, ModerationAction, UserStats } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  constructor(private supabase: SupabaseService) {}

  // User Profile Management
  getUsers(page: number = 0, limit: number = 50, filters?: any): Observable<{ data: UserProfile[], count: number }> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .range(page * limit, (page + 1) * limit - 1)
        .order('created_at', { ascending: false })
    ).pipe(
      map(result => ({
        data: result.data || [],
        count: result.count || 0
      }))
    );
  }

  getUserById(userId: string): Observable<UserProfile | null> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    ).pipe(
      map(result => result.data)
    );
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ status })
        .eq('user_id', userId)
    ).pipe(
      map(result => !result.error)
    );
  }

  updateVerificationStatus(userId: string, verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ verification_status, is_verified: verification_status === 'verified' })
        .eq('user_id', userId)
    ).pipe(
      map(result => !result.error)
    );
  }

  updateTrustScore(userId: string, trust_score: number): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ trust_score })
        .eq('user_id', userId)
    ).pipe(
      map(result => !result.error)
    );
  }

  // Reports Management
  getUserReports(page: number = 0, limit: number = 50): Observable<{ data: UserReport[], count: number }> {
    return from(
      this.supabase.client
        .from('user_reports')
        .select(`
          *,
          reporter_profile:reporter_id(display_name, email, avatar_url),
          reported_profile:reported_id(display_name, email, avatar_url)
        `, { count: 'exact' })
        .range(page * limit, (page + 1) * limit - 1)
        .order('created_at', { ascending: false })
    ).pipe(
      map(result => ({
        data: result.data || [],
        count: result.count || 0
      }))
    );
  }

  updateReportStatus(reportId: string, status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken', reviewerId: string): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_reports')
        .update({ 
          status, 
          reviewer_id: reviewerId, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', reportId)
    ).pipe(
      map(result => !result.error)
    );
  }

  // Moderation Actions
  createModerationAction(action: Partial<ModerationAction>): Observable<boolean> {
    return from(
      this.supabase.client
        .from('moderation_actions')
        .insert([action])
    ).pipe(
      map(result => !result.error)
    );
  }

  getModerationActions(page: number = 0, limit: number = 50): Observable<{ data: ModerationAction[], count: number }> {
    return from(
      this.supabase.client
        .from('moderation_actions')
        .select(`
          *,
          moderator_profile:moderator_id(display_name, email),
          target_profile:target_user_id(display_name, email)
        `, { count: 'exact' })
        .range(page * limit, (page + 1) * limit - 1)
        .order('created_at', { ascending: false })
    ).pipe(
      map(result => ({
        data: result.data || [],
        count: result.count || 0
      }))
    );
  }

  // Analytics
  getUserStats(): Observable<UserStats> {
    return from(
      Promise.all([
        this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }),
        this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
        this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned'),
        this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        this.supabase.client.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        this.supabase.client.from('user_profiles').select('trust_score')
      ])
    ).pipe(
      map(([total, verified, suspended, banned, pendingVerif, pendingReports, trustScores]) => {
        const avgTrustScore = trustScores.data ? 
          trustScores.data.reduce((sum: any, user: any) => sum + (user.trust_score || 0), 0) / (trustScores.data.length || 1) : 
          0;
        
        return {
          total_users: total.count || 0,
          verified_users: verified.count || 0,
          suspended_users: suspended.count || 0,
          banned_users: banned.count || 0,
          pending_verifications: pendingVerif.count || 0,
          reports_pending: pendingReports.count || 0,
          trust_score_avg: Math.round(avgTrustScore || 0)
        };
      })
    );
  }

  // Export functionality
  exportUsers(): Observable<Blob> {
    return this.getUsers(0, 10000).pipe(
      map(result => {
        const csv = this.convertToCSV(result.data);
        return new Blob([csv], { type: 'text/csv' });
      })
    );
  }

  private convertToCSV(data: UserProfile[]): string {
    const headers = ['User ID', 'Display Name', 'Email', 'Status', 'Verification Status', 'Trust Score', 'Created At'];
    const rows = data.map(user => [
      user.user_id,
      user.display_name || '',
      user.email || '',
      user.status,
      user.verification_status,
      user.trust_score,
      user.created_at
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
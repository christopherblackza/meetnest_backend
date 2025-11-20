import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserProfile, UserStats, DataGridOptions, DataGridResult } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {

  constructor(private supabase: SupabaseService) { }

  // Get paginated users with filters
  getUsers(options: DataGridOptions): Observable<DataGridResult<UserProfile>> {
    return from(this.fetchUsers(options)).pipe(
      catchError(error => {
        console.error('Error fetching users:', error);
        throw error;
      })
    );
  }

  private async fetchUsers(options: DataGridOptions): Promise<DataGridResult<UserProfile>> {
    let query = this.supabase.client
      .from('user_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.search) {
      query = query.or(`display_name.ilike.%${options.search}%,email.ilike.%${options.search}%,full_name.ilike.%${options.search}%`);
    }

    if (options.filters?.status) {
      query = query.eq('status', options.filters.status);
    }

    if (options.filters?.role) {
      query = query.eq('role', options.filters.role);
    }

    if (options.filters?.verified !== undefined) {
      query = query.eq('is_verified', options.filters.verified);
    }

    if (options.filters?.trustScoreMin !== undefined) {
      query = query.gte('trust_score', options.filters.trustScoreMin);
    }

    if (options.filters?.trustScoreMax !== undefined) {
      query = query.lte('trust_score', options.filters.trustScoreMax);
    }

    // Apply sorting
    if (options.sortBy && options.sortOrder) {
      query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const from = options.page * options.pageSize;
    const to = from + options.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page: options.page,
      pageSize: options.pageSize
    };
  }

  // Get user statistics
  getUserStats(): Observable<UserStats> {
    return from(this.fetchUserStats()).pipe(
      catchError(error => {
        console.error('Error fetching user stats:', error);
        throw error;
      })
    );
  }

  private async fetchUserStats(): Promise<UserStats> {
    const { data, error } = await this.supabase.client
      .rpc('get_user_stats');

    if (error) throw error;

    return data || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      avgTrustScore: 0,
      userGrowth: 0,
      activeGrowth: 0,
      verificationGrowth: 0,
      trustScoreChange: 0
    };
  }

  getUserById(userId: string): Observable<UserProfile> {
    return from(this.fetchUserById(userId)).pipe(
      catchError(error => {
        console.error('Error fetching user:', error);
        throw error;
      })
    );
  }

  private async fetchUserById(userId: string): Promise<UserProfile> {
    const { data, error } = await this.supabase.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Observable<boolean> {
    return from(this.updateUserStatusInDB(userId, status)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating user status:', error);
        throw error;
      })
    );
  }

  private async updateUserStatusInDB(userId: string, status: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  }

  updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Observable<boolean> {
    return from(this.updateUserRoleInDB(userId, role)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating user role:', error);
        throw error;
      })
    );
  }

  private async updateUserRoleInDB(userId: string, role: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  }

  updateVerificationStatus(userId: string, status: 'verified' | 'rejected' | 'pending'): Observable<boolean> {
    return from(this.updateVerificationStatusInDB(userId, status)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating verification status:', error);
        throw error;
      })
    );
  }

  private async updateVerificationStatusInDB(userId: string, status: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('user_profiles')
      .update({ 
        verification_status: status,
        is_verified: status === 'verified',
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  recalculateTrustScore(userId: string): Observable<number> {
    return from(this.recalculateTrustScoreInDB(userId)).pipe(
      catchError(error => {
        console.error('Error recalculating trust score:', error);
        throw error;
      })
    );
  }

  private async recalculateTrustScoreInDB(userId: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .rpc('recalculate_trust_score', { user_id: userId });

    if (error) throw error;
    return data || 0;
  }

  exportUsers(filters?: any): Observable<Blob> {
    return from(this.exportUsersData(filters)).pipe(
      catchError(error => {
        console.error('Error exporting users:', error);
        throw error;
      })
    );
  }

  private async exportUsersData(filters?: any): Promise<Blob> {
    let query = this.supabase.client
      .from('user_profiles')
      .select('user_id,email,display_name,full_name,status,role,verification_status,trust_score,created_at,city,country');

    // Apply filters if provided
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Convert to CSV
    const headers = ['User ID', 'Email', 'Display Name', 'Full Name', 'Status', 'Role', 'Verification', 'Trust Score', 'Created At', 'City', 'Country'];
    const csvContent = [
      headers.join(','),
      ...(data || []).map(user => [
        user.user_id,
        user.email,
        user.display_name,
        user.full_name,
        user.status,
        user.role,
        user.verification_status,
        user.trust_score,
        user.created_at,
        user.city || '',
        user.country || ''
      ].join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }
}
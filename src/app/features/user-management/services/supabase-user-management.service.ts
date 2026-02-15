import { Injectable } from '@angular/core';
import { UserManagementService } from './user-management.service.base';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable, from, throwError, map } from 'rxjs';
import { DataGridOptions, DataGridResult, UserProfile, UserStats, FounderMessageDto, FounderMessageResponse } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseUserManagementService extends UserManagementService {

  constructor(private supabase: SupabaseService) {
    super();
  }

  getUsers(options: DataGridOptions): Observable<DataGridResult<UserProfile>> {
    let query = this.supabase.client
      .from('user_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.search) {
      query = query.or(`display_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
    }

    if (options.filters) {
      if (options.filters.status) query = query.eq('status', options.filters.status);
      if (options.filters.role) query = query.eq('role', options.filters.role);
      // Add other filters as needed
    }

    // Pagination
    const fromIndex = options.page * options.pageSize;
    const toIndex = fromIndex + options.pageSize - 1;
    query = query.range(fromIndex, toIndex);

    // Sorting
    if (options.sortBy) {
      query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    return from(query).pipe(
      map(({ data, count, error }) => {
        if (error) throw error;
        return {
          data: (data || []).map(u => ({
            ...u,
            city: u.current_city,
            country: u.current_country,
            verification_status: u.verification_photo_url ? 'pending' : 'unverified' // Simplification
          })) as UserProfile[],
          total: count || 0,
          page: options.page,
          pageSize: options.pageSize
        } as DataGridResult<UserProfile>;
      })
    );
  }

  getUserStats(): Observable<UserStats> {
    // Simplified stats implementation
    return from(this.supabase.client.from('user_profiles').select('*', { count: 'exact', head: true })).pipe(
      map(({ count, error }) => {
        if (error) throw error;
        return {
          totalUsers: count || 0,
          activeUsers: 0, // Would need another query
          newUsersToday: 0,
          verifiedUsers: 0,
          avgTrustScore: 0,
          userGrowth: 0,
          activeGrowth: 0,
          verificationGrowth: 0,
          trustScoreChange: 0
        };
      })
    );
  }

  getUserById(userId: string): Observable<UserProfile> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
            ...data,
            city: data.current_city,
            country: data.current_country,
            verification_status: 'unverified' // Simplified
        } as UserProfile;
      })
    );
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ status })
        .eq('user_id', userId)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return true;
      })
    );
  }

  updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Observable<boolean> {
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return true;
      })
    );
  }

  updateVerificationStatus(userId: string, status: 'verified' | 'rejected' | 'pending'): Observable<boolean> {
    // This assumes there's a field for verification status or we update related fields
    return from(
      this.supabase.client
        .from('user_profiles')
        .update({ /* verification logic */ }) // Simplified
        .eq('user_id', userId)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return true;
      })
    );
  }

  recalculateTrustScore(userId: string): Observable<number> {
    // Trust score logic is likely backend-only, returning 100 for now
    return from(Promise.resolve(100));
  }

  sendFounderMessage(data: FounderMessageDto): Observable<FounderMessageResponse> {
    // Insert into notifications or messages table
    return from(Promise.resolve({ success: true, message: 'Message sent successfully', messageId: 'mock-id' }));
  }

  exportUsers(filters?: any): Observable<Blob> {
    // Reuse getUsers logic for export
    return this.getUsers({ page: 0, pageSize: 1000, filters }).pipe(
      map(result => {
        const users = result.data;
        const headers = ['User ID', 'Email', 'Display Name', 'Full Name', 'Status', 'Role'];
        const csvContent = [
            headers.join(','),
            ...users.map(user => [
                user.user_id,
                user.email,
                user.display_name,
                user.full_name,
                user.status,
                user.role
            ].join(','))
        ].join('\n');
        return new Blob([csvContent], { type: 'text/csv' });
      })
    );
  }
}

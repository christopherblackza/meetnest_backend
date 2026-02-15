import { Injectable } from '@angular/core';
import { Observable, from, map, catchError, of, throwError } from 'rxjs';
import { UserProfile, UserStats, DataGridOptions, DataGridResult, FounderMessageDto, FounderMessageResponse } from '../models/user.models';
import { UserManagementService } from './user-management.service.base';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NestUserManagementService extends UserManagementService {

  constructor(private http: HttpClient) {
    super();
  }

  // Get paginated users with filters
  getUsers(options: DataGridOptions): Observable<DataGridResult<UserProfile>> {
    let params = new HttpParams()
      .set('offset', (options.page * options.pageSize).toString())
      .set('limit', options.pageSize.toString());

    if (options.search) {
      params = params.set('search_term', options.search);
    }

    if (options.sortBy) {
      params = params.set('sortBy', options.sortBy);
      params = params.set('sortOrder', options.sortOrder || 'desc');
    }

    if (options.filters) {
      if (options.filters.status) params = params.set('status', options.filters.status);
      if (options.filters.role) params = params.set('role', options.filters.role);
      if (options.filters.verified !== undefined) params = params.set('verified', options.filters.verified.toString());
      if (options.filters.trustScoreMin !== undefined) params = params.set('trustScoreMin', options.filters.trustScoreMin.toString());
      if (options.filters.trustScoreMax !== undefined) params = params.set('trustScoreMax', options.filters.trustScoreMax.toString());
      if (options.filters.dateFrom) params = params.set('dateFrom', options.filters.dateFrom);
      if (options.filters.dateTo) params = params.set('dateTo', options.filters.dateTo);
    }

    return this.http.get<any>(`${environment.nestApiUrl}/users`, { params }).pipe(
      map(response => ({
        data: response.users.map((u: any) => ({
            ...u,
            city: u.current_city,
            country: u.current_country,
            verification_status: u.is_verified ? 'verified' : 'unverified'
        })),
        total: response.total_count,
        page: options.page,
        pageSize: options.pageSize
      })),
      catchError(this.handleError)
    );
  }

    /**
   * Send a founder message to a specific topic using your MCP server
   */
  sendFounderMessage(founderMessageData: FounderMessageDto): Observable<FounderMessageResponse> {
    return this.http.post<FounderMessageResponse>(`${environment.nestApiUrl}/notifications/founder-message`, founderMessageData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get user statistics
  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${environment.nestApiUrl}/users/stats`).pipe(
      catchError(this.handleError)
    );
  }

  getUserById(userId: string): Observable<UserProfile> {
    return this.http.get<any>(`${environment.nestApiUrl}/users/${userId}`).pipe(
      map(u => ({
            ...u,
            city: u.current_city,
            country: u.current_country,
            verification_status: u.is_verified ? 'verified' : 'unverified'
      })),
      catchError(this.handleError)
    );
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Observable<boolean> {
    return this.http.patch<UserProfile>(`${environment.nestApiUrl}/users/${userId}/status`, { status }).pipe(
      map(() => true),
      catchError(this.handleError)
    );
  }

  updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Observable<boolean> {
    return this.http.patch<UserProfile>(`${environment.nestApiUrl}/users/${userId}/role`, { role }).pipe(
      map(() => true),
      catchError(this.handleError)
    );
  }

  updateVerificationStatus(userId: string, status: 'verified' | 'rejected' | 'pending'): Observable<boolean> {
    return this.http.patch<UserProfile>(`${environment.nestApiUrl}/users/${userId}/verify`, { status }).pipe(
      map(() => true),
      catchError(this.handleError)
    );
  }

  recalculateTrustScore(userId: string): Observable<number> {
    return this.http.post<{ score: number }>(`${environment.nestApiUrl}/users/${userId}/trust-score`, {}).pipe(
      map(response => response.score),
      catchError(this.handleError)
    );
  }

  exportUsers(filters?: any): Observable<Blob> {
      const options: DataGridOptions = {
          page: 0,
          pageSize: 1000, 
          filters: filters
      };
      
      return this.getUsers(options).pipe(
          map(result => {
              const users = result.data;
              const headers = ['User ID', 'Email', 'Display Name', 'Full Name', 'Status', 'Role', 'Verification', 'Trust Score', 'Created At', 'City', 'Country'];
              const csvContent = [
                  headers.join(','),
                  ...users.map(user => [
                      user.user_id,
                      user.email,
                      user.display_name,
                      user.full_name,
                      user.status,
                      user.role,
                      user.is_verified ? 'verified' : 'unverified',
                      user.trust_score,
                      user.created_at,
                      user.city || '',
                      user.country || ''
                  ].join(','))
              ].join('\n');
              return new Blob([csvContent], { type: 'text/csv' });
          }),
          catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error('UserService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

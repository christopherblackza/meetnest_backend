import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NestAuthService extends AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private http: HttpClient
  ) {
    super();
  }

  get currentUser$(): Observable<User | null> {
    return this.supabaseService.currentUser$;
  }

  get sessionLoaded$(): Observable<boolean> {
    return this.supabaseService.sessionLoaded$;
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    try {
      const data = await firstValueFrom(
        this.http.post<any>(`${environment.nestApiUrl}/auth/signin`, {
          email,
          password,
        }),
      );

      if (data.session) {
        const { error } = await this.supabaseService.client.auth.setSession(data.session);
        if (error) throw error;
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (error) throw error;
  }
}

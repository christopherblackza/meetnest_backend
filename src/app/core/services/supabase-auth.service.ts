import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { Observable, from } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseAuthService extends AuthService {
  constructor(private supabaseService: SupabaseService) {
    super();
  }

  get currentUser$(): Observable<User | null> {
    return this.supabaseService.currentUser$;
  }

  get sessionLoaded$(): Observable<boolean> {
    return this.supabaseService.sessionLoaded$;
  }

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    return this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (error) throw error;
  }
}

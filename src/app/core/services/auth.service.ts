import { Observable } from 'rxjs';
import { User } from '@supabase/supabase-js';

export abstract class AuthService {
  abstract currentUser$: Observable<User | null>;
  abstract sessionLoaded$: Observable<boolean>;
  abstract signIn(email: string, password: string): Promise<{ data: any; error: any }>;
  abstract signOut(): Promise<void>;
}

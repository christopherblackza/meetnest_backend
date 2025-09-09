import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../services/supabase.service';

export const authGuard = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  
  return supabase.currentUser$.pipe(
    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/auth']);
        return false;
      }
    })
  );
};
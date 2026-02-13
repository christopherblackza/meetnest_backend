import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, filter, switchMap, take } from 'rxjs/operators';
import { SupabaseService } from '../services/supabase.service';

export const authGuard = () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  
  return supabase.sessionLoaded$.pipe(
    filter(loaded => loaded), // Wait for session to be loaded
    switchMap(() => supabase.currentUser$),
    take(1),
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
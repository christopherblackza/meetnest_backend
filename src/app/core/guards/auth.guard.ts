import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.sessionLoaded$.pipe(
    filter(loaded => loaded), // Wait for session to be loaded
    switchMap(() => authService.currentUser$),
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
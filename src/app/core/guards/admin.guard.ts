import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, filter, switchMap, take, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserManagementService } from '../../features/user-management/services/user-management.service.base';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const userManagementService = inject(UserManagementService);
  const router = inject(Router);

  return authService.sessionLoaded$.pipe(
    filter(loaded => loaded),
    switchMap(() => authService.currentUser$),
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/auth']);
        return of(false);
      }
      
      return userManagementService.getUserById(user.id).pipe(
        map(profile => {
          if (profile && profile.role === 'admin') {
            return true;
          } else {
            router.navigate(['/unauthorized']);
            return false;
          }
        }),
        catchError(error => {
          console.error('Error checking admin access:', error);
          router.navigate(['/unauthorized']);
          return of(false);
        })
      );
    })
  );
};

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService, UserProfile } from '../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.supabaseService.currentUser$.pipe(
      switchMap(user => {
        console.error('USER:', user);
        if (!user) {
          this.router.navigate(['/auth']);
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        }
        
        // Get user profile to check role
        return new Observable<boolean>(observer => {
          this.supabaseService.getUserRole(user.id).then((response) => {
            console.error('User role:', response.role);
            if (response && response.role === 'admin') {
              observer.next(true);
            } else {
              this.router.navigate(['/unauthorized']);
              observer.next(false);
            }
            observer.complete();
          }).catch((error: any) => {
            console.error('Error checking admin access:', error);
            this.router.navigate(['/unauthorized']);
            observer.next(false);
            observer.complete();
          });
        });
      })
    );
  }
}
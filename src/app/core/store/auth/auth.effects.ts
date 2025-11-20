import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { map, exhaustMap, catchError, tap, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../services/supabase.service';
import * as AuthActions from './auth.actions';
import { AuthUser } from './auth.models';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  
  // Login Effect
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginStart),
      exhaustMap(({ email, password }) =>
        this.supabaseService.signIn(email, password).then(({ data, error }) => {
          if (error) {
            return AuthActions.loginFailure({ error: error.message });
          }
          
          if (data.user) {
            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email || '',
              user_metadata: data.user.user_metadata,
              app_metadata: data.user.app_metadata,
              created_at: data.user.created_at,
              updated_at: data.user.updated_at || ''
            };
            return AuthActions.loginSuccess({ user: authUser });
          }
          
          return AuthActions.loginFailure({ error: 'Login failed' });
        }).catch(error => 
          AuthActions.loginFailure({ error: error.message })
        )
      )
    )
  );
  
  // Login Success Effect
  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(() => {
        this.router.navigate(['/dashboard']);
      })
    ),
    { dispatch: false }
  );
  
  // Logout Effect
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        this.supabaseService.signOut().then(({ error }) => {
          if (error) {
            return AuthActions.logoutFailure({ error: error.message });
          }
          return AuthActions.logoutSuccess();
        }).catch(error =>
          AuthActions.logoutFailure({ error: error.message })
        )
      )
    )
  );
  
  // Logout Success Effect
  logoutSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logoutSuccess),
      tap(() => {
        this.router.navigate(['/auth']);
      })
    ),
    { dispatch: false }
  );
  
  // Check Auth Session Effect
  checkAuthSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkAuthSession),
      switchMap(() =>
        this.supabaseService.currentUser$.pipe(
          map(user => {
            if (user) {
              const authUser: AuthUser = {
                id: user.id,
                email: user.email || '',
                user_metadata: user.user_metadata,
                app_metadata: user.app_metadata,
                created_at: user.created_at,
                updated_at: user.updated_at || ''
              };
              return AuthActions.setUser({ user: authUser });
            }
            return AuthActions.setUser({ user: null });
          })
        )
      )
    )
  );
}
import { createAction, props } from '@ngrx/store';
import { AuthUser } from './auth.models';

// Authentication Actions
export const loginStart = createAction(
  '[Auth] Login Start',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: AuthUser }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const logout = createAction('[Auth] Logout');

export const logoutSuccess = createAction('[Auth] Logout Success');

export const logoutFailure = createAction(
  '[Auth] Logout Failure',
  props<{ error: string }>()
);

// Session Management
export const checkAuthSession = createAction('[Auth] Check Session');

export const setUser = createAction(
  '[Auth] Set User',
  props<{ user: AuthUser | null }>()
);

export const clearAuthError = createAction('[Auth] Clear Error');

export const updateUserProfile = createAction(
  '[Auth] Update User Profile',
  props<{ updates: Partial<AuthUser> }>()
);

export const updateUserProfileSuccess = createAction(
  '[Auth] Update User Profile Success',
  props<{ user: AuthUser }>()
);

export const updateUserProfileFailure = createAction(
  '[Auth] Update User Profile Failure',
  props<{ error: string }>()
);
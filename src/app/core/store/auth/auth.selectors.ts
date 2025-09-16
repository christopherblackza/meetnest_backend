import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.models';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => state.isAuthenticated
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.isLoading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectLastLoginTime = createSelector(
  selectAuthState,
  (state: AuthState) => state.lastLoginTime
);

export const selectUserEmail = createSelector(
  selectCurrentUser,
  (user) => user?.email
);

export const selectUserId = createSelector(
  selectCurrentUser,
  (user) => user?.id
);

export const selectUserMetadata = createSelector(
  selectCurrentUser,
  (user) => user?.user_metadata
);
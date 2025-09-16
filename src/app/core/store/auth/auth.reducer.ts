import { createReducer, on } from '@ngrx/store';
import { AuthState, initialAuthState } from './auth.models';
import * as AuthActions from './auth.actions';

export const authReducer = createReducer(
  initialAuthState,
  
  // Login
  on(AuthActions.loginStart, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
    lastLoginTime: new Date().toISOString()
  })),
  
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error
  })),
  
  // Logout
  on(AuthActions.logout, (state) => ({
    ...state,
    isLoading: true
  })),
  
  on(AuthActions.logoutSuccess, () => ({
    ...initialAuthState
  })),
  
  on(AuthActions.logoutFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error
  })),
  
  // Session Management
  on(AuthActions.setUser, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: !!user,
    isLoading: false,
    error: null
  })),
  
  on(AuthActions.clearAuthError, (state) => ({
    ...state,
    error: null
  })),
  
  // Profile Updates
  on(AuthActions.updateUserProfile, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  
  on(AuthActions.updateUserProfileSuccess, (state, { user }) => ({
    ...state,
    user,
    isLoading: false,
    error: null
  })),
  
  on(AuthActions.updateUserProfileFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error
  }))
);
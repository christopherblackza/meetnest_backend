import { AuthState } from './auth/auth.models';

export interface AppState {
  auth: AuthState;
}
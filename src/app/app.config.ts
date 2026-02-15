import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { authReducer } from './core/store/auth/auth.reducer';
import { AuthEffects } from './core/store/auth/auth.effects';

// Services
import { AuthService } from './core/services/auth.service';
import { NestAuthService } from './core/services/nest-auth.service';
import { SupabaseAuthService } from './core/services/supabase-auth.service';

import { AnalyticsService } from './features/analytics/services/analytics.service.base';
import { NestAnalyticsService } from './features/analytics/services/nest-analytics.service';
import { SupabaseAnalyticsService } from './features/analytics/services/supabase-analytics.service';

import { UserManagementService } from './features/user-management/services/user-management.service.base';
import { NestUserManagementService } from './features/user-management/services/nest-user-management.service';
import { SupabaseUserManagementService } from './features/user-management/services/supabase-user-management.service';

import { ClientService } from './features/clients/services/client.service.base';
import { NestClientService } from './features/clients/services/nest-client.service';
import { SupabaseClientService } from './features/clients/services/supabase-client.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideStore({
      auth: authReducer
    }),
    provideEffects([AuthEffects]),
    provideStoreDevtools({ 
      maxAge: 25, 
      logOnly: environment.production 
    }),
    importProvidersFrom(
      MatSnackBarModule,
      MatDialogModule
    ),
    // Service Providers
    {
      provide: AuthService,
      useClass: environment.useDirectSupabase ? SupabaseAuthService : NestAuthService
    },
    {
      provide: AnalyticsService,
      useClass: environment.useDirectSupabase ? SupabaseAnalyticsService : NestAnalyticsService
    },
    {
      provide: UserManagementService,
      useClass: environment.useDirectSupabase ? SupabaseUserManagementService : NestUserManagementService
    },
    {
      provide: ClientService,
      useClass: environment.useDirectSupabase ? SupabaseClientService : NestClientService
    }
  ]
};

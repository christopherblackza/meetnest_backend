import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { ModeratorGuard } from './core/guards/moderator.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/events/events.component').then(m => m.EventsComponent),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'meetups',
        loadComponent: () => import('./features/meetups/meetups.component').then(m => m.MeetupsComponent),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'messaging',
        loadComponent: () => import('./features/messaging/messaging.component').then(m => m.MessagingComponent),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/catalog.component').then(m => m.CatalogComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'users',
        loadChildren: () => import('./features/user-management/user-management.routes').then(m => m.routes),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'moderation',
        loadChildren: () => import('./features/content-moderation/content-moderation.routes').then(m => m.contentModerationRoutes),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'travel',
        loadChildren: () => import('./features/travel-social/travel-social.routes').then(m => m.travelSocialRoutes),
        canActivate: [ModeratorGuard]
      },
      {
        path: 'subscriptions',
        loadChildren: () => import('./features/subscription-payments/subscription-payments.routes').then(m => m.subscriptionPaymentsRoutes),
        canActivate: [AdminGuard]
      },
      {
        path: 'analytics',
        loadChildren: () => import('./features/analytics/analytics.routes').then(m => m.analyticsRoutes),
        canActivate: [AdminGuard]
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notifications/notifications.routes').then(m => m.notificationsRoutes),
        canActivate: [ModeratorGuard]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  }
];
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-management.component').then(m => m.UserManagementComponent),
    children: [
      {
        path: 'profile/:id',
        loadComponent: () => import('./user-profile/user-profile.component').then(m => m.UserProfileComponent)
      }
    ]
  }
];
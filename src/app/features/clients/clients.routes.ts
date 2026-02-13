import { Route } from '@angular/router';
import { ClientsComponent } from './clients.component';

export const CLIENTS_ROUTES: Route[] = [
  {
    path: '',
    component: ClientsComponent,
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./client-edit/client-edit.component').then(
        (m) => m.ClientEditComponent
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./client-edit/client-edit.component').then(
        (m) => m.ClientEditComponent
      ),
  },
];
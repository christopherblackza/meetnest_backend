import { Routes } from '@angular/router';
import { NotificationsComponent } from './components/notifications.component';

export const notificationsRoutes: Routes = [
  {
    path: '',
    component: NotificationsComponent,
    title: 'Notification Management - MeetNest CMS'
  }
];
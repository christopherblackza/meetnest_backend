import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import {
  Notification,
  NotificationTemplate,
  NotificationStats,
  NotificationFilters
} from '../models/notification.models';
import { CreateNotificationDialogComponent } from './create-notification-dialog.component';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatMenuModule
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  filterForm: FormGroup;
  loading = false;
  
  notifications: Notification[] = [];
  stats: NotificationStats | null = null;
  
  // Updated columns to match actual data structure
  displayedColumns: string[] = [
    'title', 'type', 'is_read', 'user_info', 'created_at', 'actions'
  ];

  notificationTypes = [
    { value: 'nearby_meetup', label: 'Nearby Meetup' },
    { value: 'system', label: 'System' },
    { value: 'user_action', label: 'User Action' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'security', label: 'Security' },
    { value: 'payment', label: 'Payment' },
    { value: 'social', label: 'Social' },
    { value: 'travel', label: 'Travel' }
  ];

  // Updated to match actual data structure
  readStatuses = [
    { value: true, label: 'Read' },
    { value: false, label: 'Unread' }
  ];

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      type: [''],
      is_read: [''],
      search: [''],
      start_date: [''],
      end_date: ['']
    });
  }

  ngOnInit() {
    this.loadNotifications();
    this.loadStats();
    
    this.filterForm.valueChanges.subscribe(() => {
      this.loadNotifications();
    });
  }

  loadNotifications() {
    this.loading = true;
    const filters: NotificationFilters = this.filterForm.value;
    
    this.notificationService.getNotifications(filters).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        console.log('Notifications:', notifications); // Changed from console.error to console.log
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
        this.snackBar.open('Error loading notifications', 'Close', { duration: 3000 });
      }
    });
  }

  loadStats() {
    const filters: NotificationFilters = {};
    
    this.notificationService.getNotificationStats(filters).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  createNotification() {
    const dialogRef = this.dialog.open(CreateNotificationDialogComponent, {
      width: '800px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadNotifications();
        this.loadStats();
        this.snackBar.open('Notification created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  editNotification(notification: Notification) {
    const dialogRef = this.dialog.open(CreateNotificationDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { notification }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadNotifications();
        this.snackBar.open('Notification updated successfully', 'Close', { duration: 3000 });
      }
    });
  }

  deleteNotification(notification: Notification) {
    if (confirm(`Are you sure you want to delete the notification "${notification.title}"?`)) {
      this.notificationService.deleteNotification(notification.id).subscribe({
        next: () => {
          this.loadNotifications();
          this.loadStats();
          this.snackBar.open('Notification deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          this.snackBar.open('Error deleting notification', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getReadStatusColor(isRead: boolean): string {
    return isRead ? 'primary' : 'accent';
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'nearby_meetup': 'location_on',
      'system': 'settings',
      'user_action': 'person',
      'marketing': 'campaign',
      'security': 'security',
      'payment': 'payment',
      'social': 'group',
      'travel': 'flight'
    };
    return icons[type] || 'notifications';
  }

  // Extract meetup info from notification data
  getMeetupInfo(notification: Notification): string {
    if (notification.type === 'nearby_meetup') {
      const data = notification as any;
      return `${data.meetup_title || 'Unknown Meetup'} by ${data.creator_name || 'Unknown'}`;
    }
    return notification.title || 'No additional info';
  }

  clearFilters() {
    this.filterForm.reset();
  }

  refreshData() {
    this.loadNotifications();
    this.loadStats();
  }
}
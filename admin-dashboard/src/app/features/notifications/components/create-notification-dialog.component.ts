import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { Notification, BulkNotificationRequest } from '../models/notification.models';

@Component({
  selector: 'app-create-notification-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Create' }} Notification</h2>
    
    <mat-dialog-content>
      <form [formGroup]="notificationForm" class="notification-form">
        <mat-form-field>
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Notification title">
        </mat-form-field>

        <mat-form-field>
          <mat-label>Message</mat-label>
          <textarea matInput formControlName="message" rows="4" placeholder="Notification message"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field>
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="system">System</mat-option>
              <mat-option value="user_action">User Action</mat-option>
              <mat-option value="marketing">Marketing</mat-option>
              <mat-option value="security">Security</mat-option>
              <mat-option value="payment">Payment</mat-option>
              <mat-option value="social">Social</mat-option>
              <mat-option value="travel">Travel</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="low">Low</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="high">High</mat-option>
              <mat-option value="urgent">Urgent</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field>
          <mat-label>Recipient Type</mat-label>
          <mat-select formControlName="recipient_type">
            <mat-option value="all_users">All Users</mat-option>
            <mat-option value="specific_users">Specific Users</mat-option>
            <mat-option value="user_segment">User Segment</mat-option>
            <mat-option value="admins">Admins</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field *ngIf="notificationForm.get('recipient_type')?.value === 'specific_users'">
          <mat-label>User IDs (comma-separated)</mat-label>
          <input matInput formControlName="recipient_ids" placeholder="user1,user2,user3">
        </mat-form-field>

        <mat-form-field>
          <mat-label>Schedule Date (optional)</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="scheduled_at">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <div class="metadata-section">
          <h4>Additional Options</h4>
          
          <mat-form-field>
            <mat-label>Action URL (optional)</mat-label>
            <input matInput formControlName="action_url" placeholder="https://example.com/action">
          </mat-form-field>

          <mat-form-field>
            <mat-label>Image URL (optional)</mat-label>
            <input matInput formControlName="image_url" placeholder="https://example.com/image.jpg">
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onSave()" 
              [disabled]="!notificationForm.valid">
        {{ isEdit ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .notification-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
    }

    .form-row {
      display: flex;
      gap: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    .metadata-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;

      h4 {
        margin: 0 0 16px 0;
        color: #666;
      }
    }
  `]
})
export class CreateNotificationDialogComponent implements OnInit {
  notificationForm: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<CreateNotificationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { notification?: Notification }
  ) {
    this.isEdit = !!data?.notification;
    
    this.notificationForm = this.fb.group({
      title: [data?.notification?.title || '', Validators.required],
      message: [data?.notification?.message || '', Validators.required],
      type: [data?.notification?.type || 'system', Validators.required],
      priority: [data?.notification?.priority || 'medium', Validators.required],
      recipient_type: [data?.notification?.recipient_type || 'all_users', Validators.required],
      recipient_ids: [data?.notification?.recipient_ids?.join(',') || ''],
      scheduled_at: [data?.notification?.scheduled_at || ''],
      action_url: [data?.notification?.metadata?.action_url || ''],
      image_url: [data?.notification?.metadata?.image_url || '']
    });
  }

  ngOnInit() {}

  onSave() {
    if (this.notificationForm.valid) {
      const formValue = this.notificationForm.value;
      
      const notificationData = {
        title: formValue.title,
        message: formValue.message,
        type: formValue.type,
        priority: formValue.priority,
        recipient_type: formValue.recipient_type,
        recipient_ids: formValue.recipient_ids ? formValue.recipient_ids.split(',').map((id: string) => id.trim()) : undefined,
        scheduled_at: formValue.scheduled_at,
        metadata: {
          action_url: formValue.action_url,
          image_url: formValue.image_url
        }
      };

      if (this.isEdit && this.data.notification) {
        this.notificationService.updateNotification(this.data.notification.id, notificationData).subscribe({
          next: () => this.dialogRef.close(true),
          error: (error) => console.error('Error updating notification:', error)
        });
      } else {
        const bulkRequest: BulkNotificationRequest = notificationData;
        this.notificationService.sendBulkNotification(bulkRequest).subscribe({
          next: () => this.dialogRef.close(true),
          error: (error) => console.error('Error creating notification:', error)
        });
      }
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
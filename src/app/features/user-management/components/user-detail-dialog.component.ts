import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { UserProfile } from '../models/user.models';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="user-detail-dialog">
      <div mat-dialog-title>
        <h2>User Details</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div mat-dialog-content>
        <mat-card>
          <mat-card-content>
            <div class="user-info">
              <img [src]="data.avatar_url || '/assets/default-avatar.png'" 
                   [alt]="data.display_name" 
                   class="user-avatar">
              <div class="user-details">
                <h3>{{data.display_name}}</h3>
                <p>{{data.email}}</p>
                <p>ID: {{data.user_id}}</p>
                <div class="user-badges">
                  <mat-chip [color]="getStatusColor(data.status)" selected>
                    {{data.status | titlecase}}
                  </mat-chip>
                  <mat-chip [color]="getRoleColor(data.role)" selected>
                    {{data.role | titlecase}}
                  </mat-chip>
                  <mat-chip *ngIf="data.is_verified" color="primary" selected>
                    Verified
                  </mat-chip>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      
      <div mat-dialog-actions>
        <button mat-button mat-dialog-close>Close</button>
      </div>
    </div>
  `,
  styles: [`
    .user-detail-dialog {
      min-width: 400px;
    }
    
    .user-info {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .user-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .user-details h3 {
      margin: 0 0 8px 0;
    }
    
    .user-details p {
      margin: 4px 0;
      color: #666;
    }
    
    .user-badges {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
  `]
})
export class UserDetailDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<UserDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserProfile
  ) {}

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'suspended': return 'warn';
      case 'banned': return 'warn';
      default: return 'basic';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'warn';
      case 'moderator': return 'accent';
      default: return 'basic';
    }
  }
}
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { UserProfile } from '../models/user.models';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule
  ],
  template: `
    <div class="user-detail-dialog">
      <div mat-dialog-title class="dialog-header">
        <img [src]="data.avatar_url || '/assets/default-avatar.png'" 
             class="user-avatar" [alt]="data.display_name">
        <div class="user-info">
          <h2>{{data.display_name || data.full_name || 'No name'}}</h2>
          <p>{{data.email}}</p>
        </div>
      </div>

      <div mat-dialog-content>
        <mat-tab-group>
          <mat-tab label="Profile">
            <div class="profile-section">
              <div class="field-group">
                <label>Status</label>
                <mat-chip [color]="getStatusColor(data.status)" selected>
                  {{data.status | titlecase}}
                </mat-chip>
              </div>
              
              <div class="field-group">
                <label>Verification</label>
                <mat-chip [color]="getVerificationColor(data.verification_status)" selected>
                  <mat-icon *ngIf="data.is_verified">verified</mat-icon>
                  {{data.verification_status | titlecase}}
                </mat-chip>
              </div>
              
              <div class="field-group">
                <label>Trust Score</label>
                <div class="trust-score" [class]="getTrustScoreClass(data.trust_score)">
                  {{data.trust_score}}/100
                </div>
              </div>
              
              <div class="field-group">
                <label>Role</label>
                <mat-chip [color]="getRoleColor(data.role)" selected>
                  {{data.role | titlecase}}
                </mat-chip>
              </div>
              
              <div class="field-group" *ngIf="data.bio">
                <label>Bio</label>
                <p>{{data.bio}}</p>
              </div>
            </div>
          </mat-tab>
          
          <mat-tab label="Details">
            <div class="details-section">
              <div class="field-group" *ngIf="data.occupation">
                <label>Occupation</label>
                <p>{{data.occupation}}</p>
              </div>
              
              <div class="field-group" *ngIf="data.current_city">
                <label>Current Location</label>
                <p>{{data.current_city}}, {{data.current_country}}</p>
              </div>
              
              <div class="field-group" *ngIf="data.country_of_origin">
                <label>Country of Origin</label>
                <p>{{data.country_of_origin}}</p>
              </div>
              
              <div class="field-group" *ngIf="data.date_of_birth">
                <label>Date of Birth</label>
                <p>{{data.date_of_birth | date}}</p>
              </div>
              
              <div class="field-group">
                <label>Auth Provider</label>
                <p>{{data.auth_provider | titlecase}}</p>
              </div>
              
              <div class="field-group">
                <label>Member Since</label>
                <p>{{data.created_at | date:'medium'}}</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .user-detail-dialog {
      min-width: 600px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-info h2 {
      margin: 0;
    }

    .user-info p {
      margin: 4px 0 0 0;
      color: #666;
    }

    .profile-section, .details-section {
      padding: 16px 0;
    }

    .field-group {
      margin-bottom: 16px;
    }

    .field-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 4px;
      color: #333;
    }

    .trust-score {
      display: inline-block;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .trust-score.high { background-color: #e8f5e8; color: #2e7d32; }
    .trust-score.medium { background-color: #fff3e0; color: #f57c00; }
    .trust-score.low { background-color: #ffebee; color: #d32f2f; }
  `]
})
export class UserDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UserDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserProfile
  ) {}

  close() {
    this.dialogRef.close();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'suspended': return 'warn';
      case 'banned': return 'warn';
      default: return 'basic';
    }
  }

  getVerificationColor(status: string): string {
    switch (status) {
      case 'verified': return 'primary';
      case 'pending': return 'accent';
      case 'rejected': return 'warn';
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

  getTrustScoreClass(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }
}
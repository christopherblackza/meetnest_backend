import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { UserManagementService } from '../services/user-management.service.base';
import { UserProfile } from '../models/user.models';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatListModule
  ],
  templateUrl: './user-profile.component.html',
  styles: [`
    .user-profile-container {
      padding: 24px;
      width: 100%;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 60px;
      color: #666;
    }

    .profile-header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }

    .profile-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .back-button {
      margin-right: 12px;
    }

    .profile-card {
      margin-bottom: 24px;
    }

    .profile-info {
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }

    .profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #e0e0e0;
    }

    .basic-info h2 {
      margin: 0 0 4px 0;
      font-size: 28px;
    }

    .full-name {
      color: #444;
      margin: 0 0 4px 0;
      font-size: 16px;
    }

    .email {
      color: #666;
      margin: 0 0 4px 0;
    }

    .user-id {
      font-size: 12px;
      color: #999;
      font-family: monospace;
      margin: 0 0 16px 0;
    }

    .status-chips {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .status-chip {
      font-size: 11px;
      min-height: 24px;
    }

    .status-chip.verified { background-color: #4caf50; color: white; }
    .status-chip.pending { background-color: #ff9800; color: white; }
    .status-chip.unverified { background-color: #9e9e9e; color: white; }
    .status-chip.rejected { background-color: #f44336; color: white; }
    .status-chip.active { background-color: #4caf50; color: white; }
    .status-chip.suspended { background-color: #ff9800; color: white; }
    .status-chip.banned { background-color: #f44336; color: white; }
    .status-chip.role-admin { background-color: #e91e63; color: white; }
    .status-chip.role-moderator { background-color: #9c27b0; color: white; }
    .status-chip.role-user { background-color: #2196f3; color: white; }

    .trust-score-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .trust-label {
      font-weight: 500;
    }

    .trust-score {
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 4px;
    }

    .trust-score.high { background-color: #e8f5e9; color: #2e7d32; }
    .trust-score.medium { background-color: #fff3e0; color: #f57c00; }
    .trust-score.low { background-color: #ffebee; color: #c62828; }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }

    .detail-card {
      mat-card-header {
        margin-bottom: 16px;

        mat-icon[mat-card-avatar] {
          background: #f5f5f5;
          border-radius: 50%;
          padding: 8px;
          color: #666;
        }
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }
    }

    .info-item .label {
      font-weight: 500;
      color: #666;
      font-size: 13px;
      flex-shrink: 0;
      margin-right: 16px;
    }

    .info-item .value {
      text-align: right;
      word-break: break-word;
    }

    .bio-text {
      text-align: right;
      max-width: 300px;
    }

    .no-data {
      color: #999;
      font-style: italic;
      padding: 8px 0;
    }

    .verification-photo {
      max-width: 400px;
      width: 100%;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .profile-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .status-chips {
        justify-content: center;
      }

      .trust-score-section {
        justify-content: center;
      }

      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserManagementService);
  
  user: UserProfile | null = null;
  
  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    }
  }
  
  async loadUser(userId: string): Promise<void> {
    try {
      this.user = await firstValueFrom(this.userService.getUserById(userId));
    } catch (error) {
      console.error('Error loading user:', error);
      this.user = null;
    }
  }
  
  getTrustScoreClass(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
  
  goBack(): void {
    this.router.navigate(['/users']);
  }
}
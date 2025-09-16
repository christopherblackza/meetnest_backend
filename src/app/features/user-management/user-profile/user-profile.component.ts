import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { UserManagementService } from '../services/user-management.service';
import { UserProfile } from '../models/user.models';


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
      padding: 20px;
    }
    
    .profile-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .back-button {
      margin-right: 16px;
    }
    
    .profile-content {
      max-width: 1200px;
    }
    
    .profile-card {
      margin-bottom: 20px;
    }
    
    .profile-info {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    
    .profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .basic-info h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
    }
    
    .email {
      color: #666;
      margin: 0 0 4px 0;
    }
    
    .user-id {
      font-size: 12px;
      color: #999;
      margin: 0 0 16px 0;
    }
    
    .status-chips {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
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
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .trust-score.high { background-color: #e8f5e8; color: #2e7d32; }
    .trust-score.medium { background-color: #fff3e0; color: #f57c00; }
    .trust-score.low { background-color: #ffebee; color: #c62828; }
    
    .profile-tabs {
      margin-top: 20px;
    }
    
    .tab-content {
      padding: 20px 0;
    }
    
    .info-grid {
      display: grid;
      gap: 16px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .info-item .label {
      font-weight: 500;
      color: #666;
    }
    
    .info-item .value {
      text-align: right;
    }
    
    .no-data {
      color: #999;
      font-style: italic;
    }
    
    .coming-soon {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 40px;
    }
  `]
})
export class UserProfileComponent implements OnInit {
  private route: ActivatedRoute;
  private router: Router;
  private userService: UserManagementService;
  
  user: UserProfile | null = null;
  
  constructor() {
    this.route = inject(ActivatedRoute);
    this.router = inject(Router);
    this.userService = inject(UserManagementService);
  }
  
  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUser(userId);
    }
  }
  
  async loadUser(userId: string) {
    try {
      const result = await this.userService.getUserById(userId).toPromise();
      this.user = result ?? null;
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
  
  goBack() {
    this.router.navigate(['/users']);
  }
}
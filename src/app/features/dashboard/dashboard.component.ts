import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="dashboard-container">
      <h1>MeetNest Admin Dashboard</h1>
      
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon users">people</mat-icon>
              <div class="stat-info">
                <h3>Total Users</h3>
                <p class="stat-number">12,543</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon reports">flag</mat-icon>
              <div class="stat-info">
                <h3>Pending Reports</h3>
                <p class="stat-number">23</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon events">event</mat-icon>
              <div class="stat-info">
                <h3>Active Events</h3>
                <p class="stat-number">156</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon revenue">attach_money</mat-icon>
              <div class="stat-info">
                <h3>Monthly Revenue</h3>
                <p class="stat-number">$45,230</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      
      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <button mat-raised-button color="primary" routerLink="/users">
            <mat-icon>people</mat-icon>
            Manage Users
          </button>
          <button mat-raised-button color="accent" routerLink="/moderation">
            <mat-icon>flag</mat-icon>
            Review Reports
          </button>
          <button mat-raised-button routerLink="/analytics">
            <mat-icon>analytics</mat-icon>
            View Analytics
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .stat-card {
      padding: 0;
    }
    
    .stat-content {
      display: flex;
      align-items: center;
      padding: 20px;
    }
    
    .stat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-right: 20px;
    }
    
    .stat-icon.users { color: #4caf50; }
    .stat-icon.reports { color: #f44336; }
    .stat-icon.events { color: #2196f3; }
    .stat-icon.revenue { color: #ff9800; }
    
    .stat-info h3 {
      margin: 0;
      font-size: 14px;
      color: #666;
    }
    
    .stat-number {
      margin: 5px 0 0 0;
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .quick-actions {
      margin-top: 40px;
    }
    
    .actions-grid {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .actions-grid button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class DashboardComponent {
}
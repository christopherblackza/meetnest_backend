import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="unauthorized-container">
      <mat-card class="unauthorized-card">
        <mat-card-content>
          <div class="content">
            <mat-icon class="error-icon">block</mat-icon>
            <h1>Access Denied</h1>
            <p class="message">
              You don't have sufficient permissions to access this page.
              Please contact your administrator if you believe this is an error.
            </p>
            <div class="actions">
              <button mat-raised-button color="primary" routerLink="/dashboard">
                <mat-icon>dashboard</mat-icon>
                Go to Dashboard
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      background-color: #f5f5f5;
    }

    .unauthorized-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    .content {
      padding: 40px 20px;
    }

    .error-icon {
      font-size: 72px;
      height: 72px;
      width: 72px;
      color: #f44336;
      margin-bottom: 20px;
    }

    h1 {
      color: #333;
      margin-bottom: 16px;
      font-size: 2rem;
      font-weight: 500;
    }

    .message {
      color: #666;
      font-size: 1.1rem;
      line-height: 1.5;
      margin-bottom: 32px;
    }

    .actions {
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    button {
      min-width: 160px;
    }

    button mat-icon {
      margin-right: 8px;
    }
  `]
})
export class UnauthorizedComponent {
}
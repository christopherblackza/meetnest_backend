import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #drawer class="sidenav" fixedInViewport mode="side" opened>
        <mat-toolbar class="sidenav-header">
          <span>MeetNest Admin</span>
        </mat-toolbar>
        
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          
          <a mat-list-item routerLink="/events" routerLinkActive="active">
            <mat-icon matListItemIcon>event</mat-icon>
            <span matListItemTitle>Events</span>
          </a>
          
          <a mat-list-item routerLink="/meetups" routerLinkActive="active">
            <mat-icon matListItemIcon>group</mat-icon>
            <span matListItemTitle>Meetups</span>
          </a>
          
          <a mat-list-item routerLink="/messaging" routerLinkActive="active">
            <mat-icon matListItemIcon>chat</mat-icon>
            <span matListItemTitle>Messaging</span>
          </a>
          
          <a mat-list-item routerLink="/catalog" routerLinkActive="active">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>Catalog</span>
          </a>
          
          <a mat-list-item routerLink="/users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>User Management</span>
          </a>
          
          <a mat-list-item routerLink="/moderation" routerLinkActive="active">
            <mat-icon matListItemIcon>flag</mat-icon>
            <span matListItemTitle>Content Moderation</span>
          </a>
          
          <a mat-list-item routerLink="/travel" routerLinkActive="active">
            <mat-icon matListItemIcon>travel_explore</mat-icon>
            <span matListItemTitle>Travel & Social</span>
          </a>
          
          <a mat-list-item routerLink="/subscriptions" routerLinkActive="active">
            <mat-icon matListItemIcon>payment</mat-icon>
            <span matListItemTitle>Subscriptions</span>
          </a>
          
          <a mat-list-item routerLink="/analytics" routerLinkActive="active">
            <mat-icon matListItemIcon>analytics</mat-icon>
            <span matListItemTitle>Analytics</span>
          </a>
          
          <a mat-list-item routerLink="/notifications" routerLinkActive="active">
            <mat-icon matListItemIcon>notifications</mat-icon>
            <span matListItemTitle>Notifications</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      
      <mat-sidenav-content>
        <mat-toolbar class="main-toolbar">
          <button mat-icon-button (click)="drawer.toggle()">
            <mat-icon>menu</mat-icon>
          </button>
          
          <span class="spacer"></span>
          
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>
        
        <div class="main-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    
    .sidenav {
      width: 250px;
    }
    
    .sidenav-header {
      background-color: #3f51b5;
      color: white;
    }
    
    .main-toolbar {
      background-color: #fff;
      color: #333;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .main-content {
      height: calc(100vh - 64px);
      overflow-y: auto;
    }
    
    .main-content > * {
      padding: 20px;
    }
    
    .main-content .travel-social-container {
      padding: 0;
    }
    
    .main-content .travel-social-container .header,
    .main-content .travel-social-container .stats-grid,
    .main-content .travel-social-container .filters-card {
      padding: 0 20px;
    }
    
    .active {
      background-color: rgba(63, 81, 181, 0.1);
      color: #3f51b5;
    }
  `]
})
export class LayoutComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  
  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}
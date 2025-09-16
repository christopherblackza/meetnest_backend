import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { Observable } from 'rxjs';
import { UserProfile, UserStats } from './models/user.models';
import { UserManagementService } from './services/user-management.service';
import { UserDetailDialogComponent } from './components/user-detail-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: UserProfile[] = [];
  totalUsers = 0;
  pageSize = 50;
  currentPage = 0;
  stats$: Observable<UserStats>;
  
  displayedColumns = ['avatar', 'name', 'status', 'verification', 'trustScore', 'role', 'actions'];

  constructor(
    private userService: UserManagementService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.stats$ = this.userService.getUserStats();
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers(this.currentPage, this.pageSize).subscribe({
      next: (result: any) => {
        this.users = result.data;
        this.totalUsers = result.count;
      },
      error: (error: any) => {
        this.snackBar.open('Error loading users', 'Close', { duration: 3000 });
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  viewUserDetails(user: UserProfile) {
    this.dialog.open(UserDetailDialogComponent, {
      width: '800px',
      data: user
    });
  }

  updateStatus(user: UserProfile, status: 'active' | 'suspended' | 'banned') {
    this.userService.updateUserStatus(user.user_id, status).subscribe({
      next: (success: any) => {
        if (success) {
          user.status = status;
          this.snackBar.open(`User ${status}`, 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Error updating user status', 'Close', { duration: 3000 });
      }
    });
  }

  updateVerification(user: UserProfile, status: 'verified' | 'rejected') {
    this.userService.updateVerificationStatus(user.user_id, status).subscribe({
      next: (success: any) => {
        if (success) {
          user.verification_status = status;
          user.is_verified = status === 'verified';
          this.snackBar.open(`User verification ${status}`, 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('Error updating verification', 'Close', { duration: 3000 });
      }
    });
  }

  exportUsers() {
    this.userService.exportUsers().subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.snackBar.open('Error exporting users', 'Close', { duration: 3000 });
      }
    });
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
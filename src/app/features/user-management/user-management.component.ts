import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { UserProfile, UserStats, DataGridOptions, DataGridResult } from './models/user.models';
import { UserManagementService } from './services/user-management.service';
import { UserDetailDialogComponent } from './components/user-detail-dialog.component';
import { SupabaseService } from '../../core/services/supabase.service';

interface KPICard {
  title: string;
  value: number;
  change: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSidenavModule,
    MatSortModule,
    MatFormFieldModule,
    MatDividerModule
  ],
  templateUrl: 'user-management.component.html',
  styleUrls: ['user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  // Signals for reactive state management
  users = signal<UserProfile[]>([]);
  selectedUsers = signal<UserProfile[]>([]);
  selectedUserProfile = signal<UserProfile | null>(null);
  totalUsers = signal(0);
  loading = signal(false);
  stats = signal<UserStats | null>(null);
  dataResult = signal<DataGridResult<UserProfile> | null>(null);
  currentPage = signal(0);
  pageSize = signal(50);
  sortBy = signal('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Form controls for filtering
  searchControl = new FormControl('');
  statusFilter = new FormControl<string[]>([]);
  verificationFilter = new FormControl<string[]>([]);
  roleFilter = new FormControl<string[]>([]);
  trustScoreFilter = new FormControl('');

  // Filters form
  filtersForm = new FormGroup({
    search: new FormControl(''),
    role: new FormControl(''),
    status: new FormControl(''),
    verified: new FormControl<boolean | null>(null),
    trustScoreMin: new FormControl<number | null>(null),
    trustScoreMax: new FormControl<number | null>(null),
    dateFrom: new FormControl<Date | null>(null),
    dateTo: new FormControl<Date | null>(null)
  });

  displayedColumns = ['select', 'avatar', 'name', 'status', 'trustScore', 'role', 'actions'];

  // Computed properties
  filteredUsers = computed(() => {
    let filtered = this.users();
    const search = this.searchControl.value?.toLowerCase() || '';
    const statusFilters = this.statusFilter.value || [];
    const verificationFilters = this.verificationFilter.value || [];
    const roleFilters = this.roleFilter.value || [];
    const trustScoreFilter = this.trustScoreFilter.value;

    if (search) {
      filtered = filtered.filter(user => 
        user.display_name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.user_id.includes(search)
      );
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter(user => statusFilters.includes(user.status));
    }

    if (verificationFilters.length > 0) {
      filtered = filtered.filter(user => verificationFilters.includes(user.verification_status));
    }

    if (roleFilters.length > 0) {
      filtered = filtered.filter(user => roleFilters.includes(user.role));
    }

    if (trustScoreFilter) {
      filtered = filtered.filter(user => {
        switch (trustScoreFilter) {
          case 'high': return user.trust_score >= 80;
          case 'medium': return user.trust_score >= 60 && user.trust_score < 80;
          case 'low': return user.trust_score < 60;
          default: return true;
        }
      });
    }

    return filtered;
  });

  kpiCards = computed(() => {
    const statsData = this.stats();
    if (!statsData) return [];

    return [
      {
        title: 'Total Users',
        value: statsData.totalUsers,
        change: statsData.userGrowth,
        icon: 'people',
        color: 'primary'
      },
      {
        title: 'Active Users',
        value: statsData.activeUsers,
        change: statsData.activeGrowth,
        icon: 'person',
        color: 'accent'
      },
      {
        title: 'Verified Users',
        value: statsData.verifiedUsers,
        change: statsData.verificationGrowth,
        icon: 'verified',
        color: 'primary'
      },
      {
        title: 'Avg Trust Score',
        value: Math.round(statsData.avgTrustScore),
        change: statsData.trustScoreChange,
        icon: 'star',
        color: 'warn'
      }
    ];
  });

  allSelected = computed(() => {
    const filtered = this.filteredUsers();
    const selected = this.selectedUsers();
    return filtered.length > 0 && filtered.every(user => selected.includes(user));
  });

  someSelected = computed(() => {
    const filtered = this.filteredUsers();
    const selected = this.selectedUsers();
    return selected.length > 0 && !this.allSelected();
  });

  constructor(
    private userService: UserManagementService,
    private supabaseService: SupabaseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadStats();
    this.setupFilters();
  }

  setupFilters() {
    // Debounce search input
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadUsers();
    });

    // React to filter changes
    this.statusFilter.valueChanges.subscribe(() => this.loadUsers());
    this.verificationFilter.valueChanges.subscribe(() => this.loadUsers());
    this.roleFilter.valueChanges.subscribe(() => this.loadUsers());
    this.trustScoreFilter.valueChanges.subscribe(() => this.loadUsers());
  }

  async loadUsers() {
    this.loading.set(true);
    
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.searchControl.value || undefined,
        filters: {
          role: this.roleFilter.value?.[0] || undefined,
          status: this.statusFilter.value?.[0] || undefined,
          verified: this.verificationFilter.value?.includes('verified') || undefined,
          trustScoreMin: undefined,
          trustScoreMax: undefined,
          dateFrom: undefined,
          dateTo: undefined
        }
      };

      // Use actual service call instead of mock
      this.userService.getUsers(options).subscribe({
        next: (result) => {
          this.dataResult.set(result);
          this.users.set(result.data);
          this.totalUsers.set(result.total);
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.snackBar.open('Error loading users', 'Close', { duration: 3000 });
        },
        complete: () => {
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.snackBar.open('Error loading users', 'Close', { duration: 3000 });
      this.loading.set(false);
    }
  }

  async loadStats() {
    try {
      // Use actual service call instead of mock
      this.userService.getUserStats().subscribe({
        next: (stats) => {
          this.stats.set(stats);
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadUsers();
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadUsers();
  }

  clearFilters() {
    this.searchControl.reset();
    this.statusFilter.reset();
    this.verificationFilter.reset();
    this.roleFilter.reset();
    this.trustScoreFilter.reset();
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadUsers();
  }

  async exportToCsv() {
    try {
      this.loading.set(true);
      const options: DataGridOptions = {
        page: 0,
        pageSize: 10000, // Export all
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.searchControl.value || undefined,
        filters: {
          role: this.roleFilter.value?.[0] || undefined,
          status: this.statusFilter.value?.[0] || undefined,
          verified: this.verificationFilter.value?.includes('verified') || undefined,
          trustScoreMin: undefined,
          trustScoreMax: undefined,
          dateFrom: undefined,
          dateTo: undefined
        }
      };

      // Mock CSV data - replace with actual service call
      const csvData = 'ID,Name,Email,Status,Role,Trust Score\n';
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Users exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting users:', error);
      this.snackBar.open('Error exporting users', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  // Selection methods
  isSelected(user: UserProfile): boolean {
    return this.selectedUsers().some(u => u.user_id === user.user_id);
  }

  toggleSelection(user: UserProfile, selected: boolean) {
    const current = this.selectedUsers();
    if (selected) {
      this.selectedUsers.set([...current, user]);
    } else {
      this.selectedUsers.set(current.filter(u => u.user_id !== user.user_id));
    }
  }

  toggleAll(selected: boolean) {
    if (selected) {
      this.selectedUsers.set([...this.filteredUsers()]);
    } else {
      this.selectedUsers.set([]);
    }
  }

  // User actions
  viewUserProfile(user: UserProfile) {
    this.selectedUserProfile.set(user);
  }

  closeProfileDrawer() {
    this.selectedUserProfile.set(null);
  }

  viewUserDetails(user: UserProfile) {
    this.dialog.open(UserDetailDialogComponent, {
      width: '800px',
      data: user
    });
  }

  async updateStatus(user: UserProfile, status: 'active' | 'suspended' | 'banned') {
    try {
      // Mock implementation - replace with actual service call
      user.status = status;
      this.snackBar.open(`User ${status}`, 'Close', { duration: 3000 });
      this.loadUsers(); // Refresh data
    } catch (error) {
      this.snackBar.open('Error updating user status', 'Close', { duration: 3000 });
    }
  }

  async updateVerification(user: UserProfile, status: 'verified' | 'rejected') {
    try {
      // Mock implementation - replace with actual service call
      user.verification_status = status;
      user.is_verified = status === 'verified';
      this.snackBar.open(`User verification ${status}`, 'Close', { duration: 3000 });
      this.loadUsers(); // Refresh data
    } catch (error) {
      this.snackBar.open('Error updating verification', 'Close', { duration: 3000 });
    }
  }

  async bulkAction(action: 'verify' | 'suspend' | 'activate') {
    const selected = this.selectedUsers();
    if (selected.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selected.length} users?`;
    if (!confirm(confirmMessage)) return;

    try {
      for (const user of selected) {
        switch (action) {
          case 'verify':
            await this.updateVerification(user, 'verified');
            break;
          case 'suspend':
            await this.updateStatus(user, 'suspended');
            break;
          case 'activate':
            await this.updateStatus(user, 'active');
            break;
        }
      }
      this.selectedUsers.set([]);
      this.snackBar.open(`Bulk ${action} completed`, 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open(`Error during bulk ${action}`, 'Close', { duration: 3000 });
    }
  }

  async exportUsers() {
    try {
      // Mock implementation - replace with actual service call
      const csvData = 'ID,Name,Email,Status,Role,Trust Score\n';
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.snackBar.open('Error exporting users', 'Close', { duration: 3000 });
    }
  }

  // Utility methods
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

  getTrustScoreColor(score: number): 'primary' | 'accent' | 'warn' {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'accent';
    return 'warn';
  }
}
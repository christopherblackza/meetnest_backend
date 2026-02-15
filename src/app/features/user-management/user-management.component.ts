import { Component, OnInit, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormGroup, Validators, FormBuilder } from '@angular/forms';
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
import { UserProfile, UserStats, DataGridOptions, DataGridResult, FounderMessageDto } from './models/user.models';
import { UserManagementService } from './services/user-management.service.base';
import { UserDetailDialogComponent } from './components/user-detail-dialog.component';

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

  // Founder Message
  @ViewChild('founderMessageDialog') founderMessageDialog!: TemplateRef<any>;
  founderMessageForm: FormGroup;
  founderMessageTopics = [
    { value: 'all', label: 'All Users' },
    { value: 'role_user', label: 'Role: User' },
    { value: 'role_admin', label: 'Role: Admin' },
    { value: 'role_moderator', label: 'Role: Moderator' },
    { value: 'verified', label: 'Verified Users' },
    { value: 'premium', label: 'Premium Users' },
    { value: 'test', label: 'Test Topic' }
  ];

  displayedColumns = ['select', 'avatar', 'name', 'status', 'trustScore', 'role', 'actions'];

  // Computed properties
  filteredUsers = computed(() => {
    // Server side filtering is used, so we just return the users loaded from server
    return this.users();
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
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.founderMessageForm = this.fb.group({
      topic: ['all', Validators.required],
      title: ['Message from Founder', Validators.required],
      message: ['', Validators.required]
    });
  }

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
      this.currentPage.set(0);
      this.loadUsers();
    });

    // React to filter changes
    this.statusFilter.valueChanges.subscribe(() => {
        this.currentPage.set(0);
        this.loadUsers();
    });
    this.roleFilter.valueChanges.subscribe(() => {
        this.currentPage.set(0);
        this.loadUsers();
    });
    this.trustScoreFilter.valueChanges.subscribe(() => {
        this.currentPage.set(0);
        this.loadUsers();
    });
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
          trustScoreMin: this.getTrustScoreMin(this.trustScoreFilter.value),
          trustScoreMax: this.getTrustScoreMax(this.trustScoreFilter.value),
          dateFrom: undefined,
          dateTo: undefined
        }
      };

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
  
  private getTrustScoreMin(filterValue: string | null): number | undefined {
      if (!filterValue) return undefined;
      switch (filterValue) {
          case 'high': return 80;
          case 'medium': return 60;
          case 'low': return undefined;
          default: return undefined;
      }
  }

  private getTrustScoreMax(filterValue: string | null): number | undefined {
      if (!filterValue) return undefined;
      switch (filterValue) {
          case 'high': return undefined;
          case 'medium': return 79;
          case 'low': return 59;
          default: return undefined;
      }
  }

  async loadStats() {
    try {
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
    this.roleFilter.reset();
    this.trustScoreFilter.reset();
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadUsers();
  }

  async exportToCsv() {
    this.exportUsers();
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
      this.selectedUsers.set([...this.users()]);
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
    this.userService.updateUserStatus(user.user_id, status).subscribe({
        next: () => {
             this.snackBar.open(`User ${status}`, 'Close', { duration: 3000 });
             this.loadUsers();
        },
        error: (err) => {
            this.snackBar.open('Error updating user status', 'Close', { duration: 3000 });
        }
    });
  }

  async updateVerification(user: UserProfile, status: 'verified' | 'rejected') {
     const newStatus = status === 'verified' ? 'verified' : 'rejected';
     // Note: API supports 'pending' too but UI only calls with verified/rejected here
     this.userService.updateVerificationStatus(user.user_id, newStatus).subscribe({
         next: () => {
             this.snackBar.open(`User verification ${status}`, 'Close', { duration: 3000 });
             this.loadUsers();
         },
         error: (err) => {
             this.snackBar.open('Error updating verification', 'Close', { duration: 3000 });
         }
     });
  }

  async recalculateTrustScore(user: UserProfile) {
    this.userService.recalculateTrustScore(user.user_id).subscribe({
      next: (newScore) => {
        this.snackBar.open(`Trust score updated: ${newScore}`, 'Close', { duration: 3000 });
        // Update the local user object to reflect the change immediately
        const users = this.users();
        const index = users.findIndex(u => u.user_id === user.user_id);
        if (index !== -1) {
            const updatedUsers = [...users];
            updatedUsers[index] = { ...user, trust_score: newScore };
            this.users.set(updatedUsers);
        }
      },
      error: (err) => {
        console.error('Error recalculating trust score:', err);
        this.snackBar.open('Error recalculating trust score', 'Close', { duration: 3000 });
      }
    });
  }

  async bulkAction(action: 'verify' | 'suspend' | 'activate') {
    const selected = this.selectedUsers();
    if (selected.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selected.length} users?`;
    if (!confirm(confirmMessage)) return;

    try {
      // Execute sequentially to avoid overwhelming server or just fire all
      // For simplicity using Promise.all with conversion to promise
      const promises = selected.map(user => {
          return new Promise<void>((resolve, reject) => {
             let obs: Observable<any>;
             if (action === 'verify') {
                 obs = this.userService.updateVerificationStatus(user.user_id, 'verified');
             } else if (action === 'suspend') {
                 obs = this.userService.updateUserStatus(user.user_id, 'suspended');
             } else {
                 obs = this.userService.updateUserStatus(user.user_id, 'active');
             }
             
             obs.subscribe({
                 next: () => resolve(),
                 error: (err) => reject(err)
             });
          });
      });

      await Promise.all(promises);
      
      this.selectedUsers.set([]);
      this.snackBar.open(`Bulk ${action} completed`, 'Close', { duration: 3000 });
      this.loadUsers();
    } catch (error) {
      this.snackBar.open(`Error during bulk ${action}`, 'Close', { duration: 3000 });
      this.loadUsers(); // Reload anyway to show partial success
    }
  }

  openFounderMessageDialog() {
    this.founderMessageForm.reset({
      topic: 'all',
      title: 'Message from Founder',
      message: ''
    });
    this.dialog.open(this.founderMessageDialog, {
      width: '500px',
      disableClose: true,
      panelClass: 'founder-message-dialog'
    });
  }

  sendFounderMessage() {
    if (this.founderMessageForm.invalid) return;

    const { topic, title, message } = this.founderMessageForm.value;
    
    this.loading.set(true);
    
    this.userService.sendFounderMessage({
      topic,
      title,
      my_message: message
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Founder message sent successfully', 'Close', { duration: 3000 });
          this.dialog.closeAll();
        } else {
          this.snackBar.open(response.error || 'Failed to send message', 'Close', { duration: 3000 });
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error sending founder message:', error);
        this.snackBar.open('Error sending founder message', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  async exportUsers() {
    try {
      this.loading.set(true);
      
      const filters = {
          role: this.roleFilter.value?.[0] || undefined,
          status: this.statusFilter.value?.[0] || undefined,
          trustScoreMin: this.getTrustScoreMin(this.trustScoreFilter.value),
          trustScoreMax: this.getTrustScoreMax(this.trustScoreFilter.value)
      };

      this.userService.exportUsers(filters).subscribe({
          next: (blob) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              window.URL.revokeObjectURL(url);
              this.snackBar.open('Users exported successfully', 'Close', { duration: 3000 });
              this.loading.set(false);
          },
          error: (err) => {
              console.error('Error exporting users:', err);
              this.snackBar.open('Error exporting users', 'Close', { duration: 3000 });
              this.loading.set(false);
          }
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      this.snackBar.open('Error exporting users', 'Close', { duration: 3000 });
      this.loading.set(false);
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'suspended': return 'warn';
      case 'banned': return 'warn';
      default: return 'primary';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin': return 'warn';
      case 'moderator': return 'accent';
      case 'user': return 'primary';
      default: return 'primary';
    }
  }

  getTrustScoreColor(score: number): string {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'accent';
    return 'warn';
  }
}

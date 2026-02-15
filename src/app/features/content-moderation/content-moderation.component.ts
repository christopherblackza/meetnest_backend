import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ContentModerationService } from './services/content-moderation.service';
import { ContentFlag, ModerationStats, ModerationFilters, ModerationAction } from './models/moderation.models';
import { MatTableDataSource } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { SupabaseService, DataGridOptions, DataGridResult, UserReport } from '../../core/services/supabase.service';
import { UserProfile } from '../user-management/models/user.models';

// Use the UserReport from SupabaseService which matches the actual data structure
type ExtendedUserReport = UserReport & { 
  reporter: UserProfile; 
  reported_user: UserProfile; 
};

@Component({
  selector: 'app-content-moderation',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    MatDividerModule
  ],
  templateUrl: './content-moderation.component.html',
  styleUrls: ['./content-moderation.component.scss']
})
export class ContentModerationComponent implements OnInit {
  private moderationService = inject(ContentModerationService);
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Signals for reactive state
  loading = signal(false);
  stats = signal<ModerationStats | null>(null);
  reports = signal<ExtendedUserReport[]>([]);
  dataResult = signal<DataGridResult<ExtendedUserReport> | null>(null);
  currentPage = signal(0);
  pageSize = signal(10);
  sortBy = signal('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');
  
  contentFlags = signal<ContentFlag[]>([]);
  moderationActions = signal<ModerationAction[]>([]);
  
  // Regular arrays for table data sources (Material Table doesn't accept signals directly)
  contentFlagsDataSource: ContentFlag[] = [];
  moderationActionsDataSource: ModerationAction[] = [];
  
  filtersForm: FormGroup;
  
  reportColumns: string[] = ['id', 'reporter', 'reported_user', 'reason', 'status', 'created_at', 'actions'];
  flagColumns: string[] = ['id', 'content_type', 'flag_type', 'user', 'status', 'created_at', 'actions'];
  actionColumns: string[] = ['id', 'moderator', 'target_user', 'action_type', 'reason', 'created_at'];

  constructor() {
    this.filtersForm = this.fb.group({
      status: [''],
      search: [''],
      date_from: [''],
      date_to: ['']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadReports();
    this.loadStats();
    this.loadContentFlags();
    this.loadModerationActions();
  }

  loadStats() {
    this.moderationService.getModerationStats().subscribe({
      next: (stats: any) => this.stats.set(stats),
      error: (error: any) => console.error('Error loading stats:', error)
    });
  }

  async loadReports() {
    this.loading.set(true);
    
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          status: this.filtersForm.value.status || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getUserReportsGrid(options);
      console.error('USER REPORTS', result);
      
      // Cast the result to the expected type since the data structure matches
      this.dataResult.set(result as DataGridResult<ExtendedUserReport>);
      this.reports.set(result.data as ExtendedUserReport[]);
    } catch (error) {
      console.error('Error loading reports:', error);
      this.snackBar.open('Error loading reports', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadReports();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadReports();
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadReports();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadReports();
  }

  async exportToCsv() {
    try {
      this.loading.set(true);
      const options: DataGridOptions = {
        page: 0,
        pageSize: 10000, // Export all
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          status: this.filtersForm.value.status || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const csvData = await this.supabaseService.exportToCSV('user_reports', options);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Reports exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting reports:', error);
      this.snackBar.open('Error exporting reports', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  updateReportStatus(reportId: string, status: string) {
    this.moderationService.updateReportStatus(reportId, status).subscribe({
      next: (success) => {
        if (success) {
          this.loadReports();
          this.loadStats();
        }
      },
      error: (error) => console.error('Error updating report:', error)
    });
  }

  loadContentFlags() {
    this.moderationService.getContentFlags().subscribe({
      next: (flags: ContentFlag[]) => {
        this.contentFlags.set(flags);
        this.contentFlagsDataSource = flags; // Update data source for table
      },
      error: (error: any) => console.error('Error loading content flags:', error)
    });
  }

  loadModerationActions() {
    // this.moderationService.getModerationActions().subscribe({
    //   next: (actions: ModerationAction[]) => {
    //     this.moderationActions.set(actions);
    //     this.moderationActionsDataSource = actions; // Update data source for table
    //   },
    //   error: (error: any) => console.error('Error loading moderation actions:', error)
    // });
  }

  updateFlagStatus(flagId: string, status: string) {
    this.moderationService.updateFlagStatus(flagId, status).subscribe({
      next: (success: boolean) => {
        if (success) {
          this.loadContentFlags();
          this.loadStats();
          this.snackBar.open('Flag status updated successfully', 'Close', { duration: 3000 });
        }
      },
      error: (error: any) => {
        console.error('Error updating flag:', error);
        this.snackBar.open('Error updating flag status', 'Close', { duration: 3000 });
      }
    });
  }

  removeContent(flag: ContentFlag) {
    // TODO: Implement content removal logic based on content type
    console.log('Remove content for flag:', flag);
    this.snackBar.open('Content removal not yet implemented', 'Close', { duration: 3000 });
  }

  createModerationAction() {
    // TODO: Open dialog to create new moderation action
    console.log('Create moderation action');
    this.snackBar.open('Moderation action creation not yet implemented', 'Close', { duration: 3000 });
  }

  getContentTypeIcon(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case 'profile':
        return 'account_circle';
      case 'message':
        return 'message';
      case 'photo':
        return 'photo';
      case 'event':
        return 'event';
      case 'meetup':
        return 'group';
      default:
        return 'help_outline';
    }
  }

  getActionTypeIcon(actionType: string): string {
    switch (actionType?.toLowerCase()) {
      case 'warning':
        return 'warning';
      case 'temporary_suspension':
        return 'pause_circle';
      case 'permanent_ban':
        return 'block';
      case 'content_removal':
        return 'delete';
      case 'profile_restriction':
        return 'lock';
      default:
        return 'gavel';
    }
  }

  /**
   * Returns the appropriate Material icon name for a given status
   */
  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'schedule';
      case 'reviewed':
        return 'visibility';
      case 'resolved':
        return 'check_circle';
      case 'dismissed':
        return 'cancel';
      default:
        return 'help_outline';
    }
  }
}
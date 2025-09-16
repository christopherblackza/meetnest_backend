import { Component, inject, OnInit } from '@angular/core';
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
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ContentModerationService } from './services/content-moderation.service';
import { UserReport, ContentFlag, ModerationStats, ModerationFilters } from './models/moderation.models';
import { MatTableDataSource } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';

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
    ReactiveFormsModule,
    MatDividerModule
  ],
  templateUrl: './content-moderation.component.html',
  styleUrls: ['./content-moderation.component.scss']
})
export class ContentModerationComponent implements OnInit {
  private moderationService = inject(ContentModerationService);
  private fb = inject(FormBuilder);

  stats: ModerationStats | null = null;
  reports: MatTableDataSource<UserReport> = new MatTableDataSource<UserReport>([]);
  contentFlags: ContentFlag[] = [];
  
  filtersForm: FormGroup;
  
  reportColumns: string[] = ['id', 'reporter', 'reported_user', 'reason', 'status', 'created_at', 'actions'];

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
    this.loadStats();
    this.loadReports();
  }

  loadStats() {
    this.moderationService.getModerationStats().subscribe({
      next: (stats: any) => this.stats = stats,
      error: (error: any) => console.error('Error loading stats:', error)
    });
  }

  loadReports() {
    const filters = this.getFilters();
    this.moderationService.getReports(filters).subscribe({
      next: (reports) => {
        this.reports.data = reports || [];
      },
      error: (error) => {
        console.error('Error loading reports:', error);
        this.reports.data = [];
      }
    });
  }


  getFilters(): ModerationFilters {
    const formValue = this.filtersForm.value;
    const filters: ModerationFilters = {};
    
    if (formValue.status) filters.status = formValue.status;
    if (formValue.search) filters.search = formValue.search;
    if (formValue.date_from) filters.date_from = formValue.date_from;
    if (formValue.date_to) filters.date_to = formValue.date_to;
    
    return filters;
  }

  applyFilters() {
    this.loadReports();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.loadReports();
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
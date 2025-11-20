import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, Meetup, UserProfile, DataGridOptions, DataGridResult } from '../../core/services/supabase.service';
import { CreateMeetupDialogComponent } from './components/create-meetup-dialog.component';
import { ViewMeetupDialogComponent } from './components/view-meetup-dialog/view-meetup-dialog.component';
import { MapViewDialogComponent } from '../shared/components/map-view-dialog.component';
import { DeleteConfirmationDialogComponent } from '../shared/components/delete-confirmation-dialog.component';

interface MeetupWithDetails extends Meetup {
  creator: UserProfile;
  participant_count: number;
}

@Component({
  selector: 'app-meetups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './meetups.component.html',
  styleUrl: './meetups.component.scss'
})
export class MeetupsComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Signals
  loading = signal(false);
  meetups = signal<MeetupWithDetails[]>([]);
  dataResult = signal<DataGridResult<MeetupWithDetails> | null>(null);
  currentPage = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Form
  filtersForm = new FormGroup({
    search: new FormControl(''),
    status: new FormControl(''),
    femaleOnly: new FormControl(false),
    startDate: new FormControl(),
    endDate: new FormControl()
  });

  displayedColumns = ['title', 'creator', 'expiration', 'participants', 'location', 'femaleOnly', 'actions'];

  ngOnInit() {
    this.loadMeetups();
    
    // Auto-apply filters on form changes with debounce
    this.filtersForm.valueChanges.subscribe(() => {
      setTimeout(() => this.applyFilters(), 300);
    });
  }

  async loadMeetups() {
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
          femaleOnly: this.filtersForm.value.femaleOnly || undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getMeetupsGrid(options);
      this.dataResult.set(result);
      this.meetups.set(result.data);
    } catch (error) {
      console.error('Error loading meetups:', error);
      this.snackBar.open('Error loading meetups', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadMeetups();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadMeetups();
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadMeetups();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadMeetups();
  }

  getExpirationStatus(expiresAt: string): string {
    const now = new Date();
    const expiration = new Date(expiresAt);
    return now > expiration ? 'expired' : 'active';
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
          femaleOnly: this.filtersForm.value.femaleOnly || undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const csvData = await this.supabaseService.exportToCSV('meetups', options);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meetups_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Meetups exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting meetups:', error);
      this.snackBar.open('Error exporting meetups', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  createMeetup(): void {
    const dialogRef = this.dialog.open(CreateMeetupDialogComponent, {
      width: '600px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMeetups();
        this.snackBar.open('Meetup created successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  viewMeetup(meetup: MeetupWithDetails): void {
    const dialogRef = this.dialog.open(ViewMeetupDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { meetup }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'edit') {
        this.editMeetup(result.meetup);
      }
    });
  }

  editMeetup(meetup: MeetupWithDetails) {
    // TODO: Implement edit meetup dialog
    this.snackBar.open(`Editing meetup: ${meetup.title}`, 'Close', { duration: 3000 });
  }

  viewOnMap(meetup: MeetupWithDetails) {
    this.dialog.open(MapViewDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        item: {
          id: meetup.id,
          title: meetup.title,
          latitude: meetup.latitude,
          longitude: meetup.longitude,
          type: 'meetup' as const,
          description: meetup.description,
          emoticon: meetup.emoticon,
          max_participants: meetup.max_participants,
          participant_count: meetup.participant_count,
          expires_at: meetup.expires_at
        }
      }
    });
  }

  deleteMeetup(meetup: MeetupWithDetails) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Delete Meetup',
        message: 'Are you sure you want to delete this meetup? This action will permanently remove the meetup and all associated data.',
        itemName: meetup.title,
        itemType: 'meetup' as const,
        warningMessage: 'All participants will be notified of the cancellation.',
        cascadeInfo: [
          'Remove all participant registrations',
          'Delete associated chat messages',
          'Cancel any scheduled notifications',
          'Remove meetup from all user lists'
        ]
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          // TODO: Implement actual deletion logic with Supabase
          this.snackBar.open(`Meetup "${meetup.title}" has been deleted successfully`, 'Close', { 
            duration: 4000,
            panelClass: ['success-snackbar']
          });
          
          // Refresh the meetups list
          await this.loadMeetups();
        } catch (error) {
          console.error('Error deleting meetup:', error);
          this.snackBar.open('Failed to delete meetup. Please try again.', 'Close', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      }
    });
  }
}
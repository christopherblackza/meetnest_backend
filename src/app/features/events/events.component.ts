import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SupabaseService, Event, UserProfile, DataGridOptions, DataGridResult } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import { CreateEventDialogComponent } from './components/create-event-dialog.component';
import { ViewEventDialogComponent } from './components/view-event-dialog.component';
import { EditEventDialogComponent } from './components/edit-event-dialog.component';
import { MapViewDialogComponent } from '../shared/components/map-view-dialog.component';
import { DeleteConfirmationDialogComponent } from '../shared/components/delete-confirmation-dialog.component';
import { MatDividerModule } from '@angular/material/divider';

interface EventWithDetails extends Event {
  creator: UserProfile;
  attendee_count: number;
}

@Component({
  selector: 'app-events',
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
    MatDividerModule
  ],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
 
})
export class EventsComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(false);
  events = signal<EventWithDetails[]>([]);
  dataResult = signal<DataGridResult<EventWithDetails> | null>(null);
  currentPage = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('start_date_time');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Form
  filtersForm = new FormGroup({
    search: new FormControl(''),
    status: new FormControl(''),
    visibility: new FormControl(''),
    startDate: new FormControl(),
    endDate: new FormControl()
  });

  displayedColumns = ['title', 'creator', 'datetime', 'participants', 'location', 'visibility', 'actions'];

  ngOnInit() {
    this.loadEvents();
    
    // Auto-apply filters on form changes with debounce
    this.filtersForm.valueChanges.subscribe(() => {
      setTimeout(() => this.applyFilters(), 300);
    });
  }

  async loadEvents() {
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
          isPublic: this.filtersForm.value.visibility !== '' ? this.filtersForm.value.visibility : undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getEventsGrid(options);
      this.dataResult.set(result);
      this.events.set(result.data);
    } catch (error) {
      console.error('Error loading events:', error);
      this.snackBar.open('Error loading events', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadEvents();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadEvents();
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadEvents();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadEvents();
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
          isPublic: this.filtersForm.value.visibility !== '' ? this.filtersForm.value.visibility : undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const csvData = await this.supabaseService.exportToCSV('events', options);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `events_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Events exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting events:', error);
      this.snackBar.open('Error exporting events', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  createEvent() {
    const dialogRef = this.dialog.open(CreateEventDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the events list
        this.loadEvents();
        this.snackBar.open('Event created successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  viewEvent(event: EventWithDetails) {
    const dialogRef = this.dialog.open(ViewEventDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: event
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'edit') {
        this.editEvent(result.event);
      }
    });
  }

  editEvent(event: EventWithDetails) {
    const dialogRef = this.dialog.open(EditEventDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: event
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the events list
        this.loadEvents();
        this.snackBar.open('Event updated successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  viewOnMap(event: EventWithDetails) {
    this.dialog.open(MapViewDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        item: {
          id: event.id,
          title: event.title,
          latitude: event.latitude,
          longitude: event.longitude,
          type: 'event' as const,
          description: event.description,
          max_participants: event.max_participants,
          attendee_count: event.attendee_count,
          start_date_time: event.start_date_time
        }
      }
    });
  }

  deleteEvent(event: EventWithDetails) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: 'Delete Event',
        message: 'Are you sure you want to delete this event? This action will permanently remove the event and all associated data.',
        itemName: event.title,
        itemType: 'event' as const,
        warningMessage: 'All attendees will be notified of the cancellation.',
        cascadeInfo: [
          'Remove all attendee registrations',
          'Delete associated chat messages',
          'Cancel any scheduled notifications',
          'Remove event from all user calendars'
        ]
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          // TODO: Implement actual deletion logic with Supabase
          this.snackBar.open(`Event "${event.title}" has been deleted successfully`, 'Close', { 
            duration: 4000,
            panelClass: ['success-snackbar']
          });
          
          // Refresh the events list
          await this.loadEvents();
        } catch (error) {
          console.error('Error deleting event:', error);
          this.snackBar.open('Failed to delete event. Please try again.', 'Close', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      }
    });
  }
}
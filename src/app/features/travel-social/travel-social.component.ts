import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TravelSocialService } from './services/travel-social.service';
import {
  City,
  FutureTrip,
  Meetup,
  Event,
  Chat,
  TravelSocialStats,
  TravelSocialFilters
} from './models/travel-social.models';
import { SupabaseService, DataGridOptions, DataGridResult } from '../../core/services/supabase.service';
import {MatDividerModule} from '@angular/material/divider';


@Component({
  selector: 'app-travel-social',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    MatDividerModule
  ],
  templateUrl: './travel-social.component.html',
  styleUrls: ['./travel-social.component.scss']
})
export class TravelSocialComponent implements OnInit {
  private travelSocialService = inject(TravelSocialService);
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Signals for reactive state
  loading = signal(false);
  stats = signal<TravelSocialStats | null>(null);
  cities = signal<City[]>([]);
  futureTrips = signal<FutureTrip[]>([]);
  meetups = signal<Meetup[]>([]);
  events = signal<Event[]>([]);
  chats = signal<Chat[]>([]);
  
  // Data grid results with proper typing
  citiesResult = signal<DataGridResult<City> | null>(null);
  tripsResult = signal<DataGridResult<FutureTrip> | null>(null);
  meetupsResult = signal<DataGridResult<Meetup> | null>(null);
  eventsResult = signal<DataGridResult<any> | null>(null);
  chatsResult = signal<DataGridResult<any> | null>(null);

  // Pagination and sorting
  currentPage = signal(0);
  pageSize = signal(10);
  sortBy = signal('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  filtersForm: FormGroup;
  currentFilters: TravelSocialFilters = {};

  cityColumns = ['name', 'country', 'timezone', 'created_at', 'actions'];
  tripColumns = ['user', 'city', 'dates', 'is_public', 'actions'];
  meetupColumns = ['title', 'organizer', 'city', 'date_time', 'is_active', 'actions'];
  eventColumns = ['title', 'organizer', 'city', 'date_time', 'max_attendees', 'is_active', 'actions'];
  chatColumns = ['name', 'type', 'participants', 'created_at', 'updated_at', 'actions'];

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      city_id: [''],
      date_from: [''],
      date_to: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    // Load statistics
    this.travelSocialService.getTravelSocialStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (error) => console.error('Error loading stats:', error)
    });

    // Load all data
    this.loadCities();
    this.loadFutureTrips();
    this.loadMeetups();
    this.loadEvents();
    this.loadChats();
  }

  private async loadCities(): Promise<void> {
    this.loading.set(true);
    
    try {
      // Use the travel social service for cities instead of supabase grid
      this.travelSocialService.getCities(this.currentFilters).subscribe({
        next: (cities) => {
          this.cities.set(cities);
          // Create a mock result for consistency
          this.citiesResult.set({
            data: cities,
            count: cities.length,
            page: this.currentPage(),
            pageSize: this.pageSize(),
            totalPages: Math.ceil(cities.length / this.pageSize())
          });
        },
        error: (error) => {
          console.error('Error loading cities:', error);
          this.snackBar.open('Error loading cities', 'Close', { duration: 3000 });
        },
        complete: () => this.loading.set(false)
      });
    } catch (error) {
      console.error('Error loading cities:', error);
      this.snackBar.open('Error loading cities', 'Close', { duration: 3000 });
      this.loading.set(false);
    }
  }

  private async loadMeetups(): Promise<void> {
    this.loading.set(true);
    
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          cityId: this.filtersForm.value.city_id || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getMeetupsGrid(options);
      this.meetupsResult.set(result as any);
      // Map the result data to Meetup type
       const meetupsData = result.data.map(meetup => ({
         id: meetup.id,
         title: meetup.title,
         description: meetup.description,
         organizer_id: meetup.created_by || (meetup as any).organizer_id,
         city_id: (meetup as any).city_id,
         date_time: (meetup as any).expires_at || (meetup as any).date_time,
         max_participants: meetup.max_participants,
         is_active: (meetup as any).is_active !== false,
         female_only: meetup.female_only,
         expires_at: meetup.expires_at,
         participant_count: (meetup as any).participant_count || 0,
         chat_id: (meetup as any).chat_id,
         created_at: (meetup as any).created_at,
         updated_at: (meetup as any).updated_at
       })) as Meetup[];
      this.meetups.set(meetupsData);
    } catch (error) {
      console.error('Error loading meetups:', error);
      this.snackBar.open('Error loading meetups', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadEvents(): Promise<void> {
    this.loading.set(true);
    
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          cityId: this.filtersForm.value.city_id || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getEventsGrid(options);
      this.eventsResult.set(result);
      // Map the result data to Event type
      const eventsData = result.data.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        organizer_id: event.created_by || (event as any).organizer_id,
        city_id: (event as any).city_id,
        date_time: event.start_date_time || (event as any).date_time,
        max_attendees: event.max_participants || (event as any).max_attendees,
        is_active: (event as any).is_active !== false,
        is_public: event.is_public,
        created_at: (event as any).created_at,
        updated_at: (event as any).updated_at
      })) as Event[];
      this.events.set(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      this.snackBar.open('Error loading events', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFutureTrips(): Promise<void> {
    this.loading.set(true);
    
    try {
      // For now, we'll use the travel social service for future trips
      this.travelSocialService.getFutureTrips(this.currentFilters).subscribe({
        next: (trips) => this.futureTrips.set(trips),
        error: (error) => console.error('Error loading trips:', error)
      });
    } catch (error) {
      console.error('Error loading trips:', error);
      this.snackBar.open('Error loading trips', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadChats(): Promise<void> {
    this.loading.set(true);
    
    try {
      // Use the travel social service for chats instead of supabase grid
      this.travelSocialService.getChats(this.currentFilters).subscribe({
        next: (chats) => {
          this.chats.set(chats);
          // Create a mock result for consistency
          this.chatsResult.set({
            data: chats,
            count: chats.length,
            page: this.currentPage(),
            pageSize: this.pageSize(),
            totalPages: Math.ceil(chats.length / this.pageSize())
          });
        },
        error: (error) => {
          console.error('Error loading chats:', error);
          this.snackBar.open('Error loading chats', 'Close', { duration: 3000 });
        },
        complete: () => this.loading.set(false)
      });
    } catch (error) {
      console.error('Error loading chats:', error);
      this.snackBar.open('Error loading chats', 'Close', { duration: 3000 });
      this.loading.set(false);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadData();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadData();
  }

  applyFilters(): void {
    this.currentFilters = { ...this.filtersForm.value };
    this.currentPage.set(0);
    this.loadData();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.currentFilters = {};
    this.currentPage.set(0);
    this.loadData();
  }

  async exportToCsv(type: 'events' | 'meetups' | 'chats') {
    try {
      this.loading.set(true);
      const options: DataGridOptions = {
        page: 0,
        pageSize: 10000, // Export all
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          cityId: this.filtersForm.value.city_id || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      let csvData: string;
      let filename: string;

      switch (type) {
        case 'events':
          csvData = await this.supabaseService.exportToCSV('events', options);
          filename = `events_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'meetups':
          csvData = await this.supabaseService.exportToCSV('meetups', options);
          filename = `meetups_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'chats':
          csvData = await this.supabaseService.exportToCSV('chat_messages', options);
          filename = `chats_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error('Invalid export type');
      }
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open(`${type} exported successfully`, 'Close', { duration: 3000 });
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      this.snackBar.open(`Error exporting ${type}`, 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  toggleMeetupStatus(meetup: Meetup): void {
    this.travelSocialService.updateMeetupStatus(meetup.id, !meetup.is_active).subscribe({
      next: () => {
        meetup.is_active = !meetup.is_active;
        this.loadData(); // Refresh stats
      },
      error: (error) => console.error('Error updating meetup status:', error)
    });
  }

  toggleEventStatus(event: Event): void {
    this.travelSocialService.updateEventStatus(event.id, !event.is_active).subscribe({
      next: () => {
        event.is_active = !event.is_active;
        this.loadData(); // Refresh stats
      },
      error: (error) => console.error('Error updating event status:', error)
    });
  }

  // TrackBy functions for ngFor performance optimization
  trackByCity(index: number, city: City): string {
    return city.id;
  }
}
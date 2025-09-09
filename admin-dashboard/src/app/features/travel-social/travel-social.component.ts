import { Component, OnInit } from '@angular/core';
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
    ReactiveFormsModule
  ],
  templateUrl: './travel-social.component.html',
  styleUrls: ['./travel-social.component.scss']
})
export class TravelSocialComponent implements OnInit {
  stats: TravelSocialStats | null = null;
  cities: City[] = [];
  futureTrips: FutureTrip[] = [];
  meetups: Meetup[] = [];
  events: Event[] = [];
  chats: Chat[] = [];

  filtersForm: FormGroup;
  currentFilters: TravelSocialFilters = {};

  cityColumns = ['name', 'country', 'timezone', 'created_at', 'actions'];
  tripColumns = ['user', 'city', 'dates', 'is_public', 'actions'];
  meetupColumns = ['title', 'organizer', 'city', 'date_time', 'is_active', 'actions'];
  eventColumns = ['title', 'organizer', 'city', 'date_time', 'max_attendees', 'is_active', 'actions'];
  chatColumns = ['name', 'type', 'participants', 'created_at', 'updated_at', 'actions'];

  constructor(
    private travelSocialService: TravelSocialService,
    private fb: FormBuilder
  ) {
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
      next: (stats) => this.stats = stats,
      error: (error) => console.error('Error loading stats:', error)
    });

    // Load all data
    this.loadCities();
    this.loadFutureTrips();
    this.loadMeetups();
    this.loadEvents();
    this.loadChats();
  }

  private loadCities(): void {
    this.travelSocialService.getCities(this.currentFilters).subscribe({
      next: (cities) => this.cities = cities,
      error: (error) => console.error('Error loading cities:', error)
    });
  }

  private loadFutureTrips(): void {
    this.travelSocialService.getFutureTrips(this.currentFilters).subscribe({
      next: (trips) => this.futureTrips = trips,
      error: (error) => console.error('Error loading trips:', error)
    });
  }

  private loadMeetups(): void {
    this.travelSocialService.getMeetups(this.currentFilters).subscribe({
      next: (meetups) => this.meetups = meetups,
      error: (error) => console.error('Error loading meetups:', error)
    });
  }

  private loadEvents(): void {
    this.travelSocialService.getEvents(this.currentFilters).subscribe({
      next: (events) => this.events = events,
      error: (error) => console.error('Error loading events:', error)
    });
  }

  private loadChats(): void {
    this.travelSocialService.getChats(this.currentFilters).subscribe({
      next: (chats) => this.chats = chats,
      error: (error) => console.error('Error loading chats:', error)
    });
  }

  applyFilters(): void {
    this.currentFilters = { ...this.filtersForm.value };
    this.loadData();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.currentFilters = {};
    this.loadData();
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
}
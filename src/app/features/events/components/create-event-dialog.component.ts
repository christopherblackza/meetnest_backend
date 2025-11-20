import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-create-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Event</h2>
    
    <mat-dialog-content>
      <form [formGroup]="eventForm" class="event-form">
        <mat-form-field appearance="outline">
          <mat-label>Event Title</mat-label>
          <input matInput formControlName="title" placeholder="Enter event title">
          <mat-error *ngIf="eventForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="4" placeholder="Describe your event"></textarea>
          <mat-error *ngIf="eventForm.get('description')?.hasError('required')">
            Description is required
          </mat-error>
        </mat-form-field>

        <div class="date-time-row">
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startDatePicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #startDatePicker></mat-datepicker>
            <mat-error *ngIf="eventForm.get('startDate')?.hasError('required')">
              Start date is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Start Time</mat-label>
            <input matInput type="time" formControlName="startTime">
            <mat-error *ngIf="eventForm.get('startTime')?.hasError('required')">
              Start time is required
            </mat-error>
          </mat-form-field>
        </div>

        <div class="date-time-row">
          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endDatePicker" formControlName="endDate">
            <mat-datepicker-toggle matSuffix [for]="endDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #endDatePicker></mat-datepicker>
            <mat-error *ngIf="eventForm.get('endDate')?.hasError('required')">
              End date is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>End Time</mat-label>
            <input matInput type="time" formControlName="endTime">
            <mat-error *ngIf="eventForm.get('endTime')?.hasError('required')">
              End time is required
            </mat-error>
          </mat-form-field>
        </div>

        <div class="location-row">
          <mat-form-field appearance="outline">
            <mat-label>Latitude</mat-label>
            <input matInput type="number" formControlName="latitude" step="0.000001" placeholder="e.g., 40.7128">
            <mat-error *ngIf="eventForm.get('latitude')?.hasError('required')">
              Latitude is required
            </mat-error>
            <mat-error *ngIf="eventForm.get('latitude')?.hasError('min') || eventForm.get('latitude')?.hasError('max')">
              Latitude must be between -90 and 90
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Longitude</mat-label>
            <input matInput type="number" formControlName="longitude" step="0.000001" placeholder="e.g., -74.0060">
            <mat-error *ngIf="eventForm.get('longitude')?.hasError('required')">
              Longitude is required
            </mat-error>
            <mat-error *ngIf="eventForm.get('longitude')?.hasError('min') || eventForm.get('longitude')?.hasError('max')">
              Longitude must be between -180 and 180
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Maximum Participants</mat-label>
          <input matInput type="number" formControlName="maxParticipants" min="1" placeholder="e.g., 50">
          <mat-error *ngIf="eventForm.get('maxParticipants')?.hasError('required')">
            Maximum participants is required
          </mat-error>
          <mat-error *ngIf="eventForm.get('maxParticipants')?.hasError('min')">
            Must be at least 1 participant
          </mat-error>
        </mat-form-field>

        <mat-checkbox formControlName="isPublic">
          Make this event public
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="eventForm.invalid || loading">
        {{ loading ? 'Creating...' : 'Create Event' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .event-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
      max-width: 600px;
    }

    .date-time-row,
    .location-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    @media (max-width: 600px) {
      .event-form {
        min-width: 300px;
      }

      .date-time-row,
      .location-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreateEventDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateEventDialogComponent>);
  private supabaseService = inject(SupabaseService);
  private snackBar = inject(MatSnackBar);

  loading = false;

  eventForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    startDate: ['', Validators.required],
    startTime: ['', Validators.required],
    endDate: ['', Validators.required],
    endTime: ['', Validators.required],
    latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
    maxParticipants: ['', [Validators.required, Validators.min(1)]],
    isPublic: [true]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const formValue = this.eventForm.value;
      
      // Combine date and time
      const startDateTime = new Date(formValue.startDate);
      const [startHours, startMinutes] = formValue.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      const endDateTime = new Date(formValue.endDate);
      const [endHours, endMinutes] = formValue.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        this.snackBar.open('End time must be after start time', 'Close', { duration: 3000 });
        this.loading = false;
        return;
      }

      const eventData = {
        title: formValue.title,
        description: formValue.description,
        start_date_time: startDateTime.toISOString(),
        end_date_time: endDateTime.toISOString(),
        latitude: parseFloat(formValue.latitude),
        longitude: parseFloat(formValue.longitude),
        max_participants: parseInt(formValue.maxParticipants),
        is_public: formValue.isPublic
      };

      const newEvent = await this.supabaseService.createEvent(eventData);
      
      this.snackBar.open('Event created successfully!', 'Close', { duration: 3000 });
      this.dialogRef.close(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      this.snackBar.open('Error creating event. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
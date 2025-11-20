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
  selector: 'app-create-meetup-dialog',
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
    <h2 mat-dialog-title>Create New Meetup</h2>
    
    <mat-dialog-content>
      <form [formGroup]="meetupForm" class="meetup-form">
        <mat-form-field appearance="outline">
          <mat-label>Meetup Title</mat-label>
          <input matInput formControlName="title" placeholder="Enter meetup title">
          <mat-error *ngIf="meetupForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="4" placeholder="Describe your meetup"></textarea>
          <mat-error *ngIf="meetupForm.get('description')?.hasError('required')">
            Description is required
          </mat-error>
        </mat-form-field>

        <div class="location-row">
          <mat-form-field appearance="outline">
            <mat-label>Latitude</mat-label>
            <input matInput type="number" formControlName="latitude" step="0.000001" placeholder="e.g., 40.7128">
            <mat-error *ngIf="meetupForm.get('latitude')?.hasError('required')">
              Latitude is required
            </mat-error>
            <mat-error *ngIf="meetupForm.get('latitude')?.hasError('min') || meetupForm.get('latitude')?.hasError('max')">
              Latitude must be between -90 and 90
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Longitude</mat-label>
            <input matInput type="number" formControlName="longitude" step="0.000001" placeholder="e.g., -74.0060">
            <mat-error *ngIf="meetupForm.get('longitude')?.hasError('required')">
              Longitude is required
            </mat-error>
            <mat-error *ngIf="meetupForm.get('longitude')?.hasError('min') || meetupForm.get('longitude')?.hasError('max')">
              Longitude must be between -180 and 180
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Maximum Participants</mat-label>
          <input matInput type="number" formControlName="maxParticipants" min="1" placeholder="e.g., 20">
          <mat-error *ngIf="meetupForm.get('maxParticipants')?.hasError('required')">
            Maximum participants is required
          </mat-error>
          <mat-error *ngIf="meetupForm.get('maxParticipants')?.hasError('min')">
            Must be at least 1 participant
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Emoticon</mat-label>
          <mat-select formControlName="emoticon">
            <mat-option value="🤝">🤝 Handshake</mat-option>
            <mat-option value="☕">☕ Coffee</mat-option>
            <mat-option value="🍕">🍕 Food</mat-option>
            <mat-option value="🎮">🎮 Gaming</mat-option>
            <mat-option value="📚">📚 Study</mat-option>
            <mat-option value="🏃">🏃 Sports</mat-option>
            <mat-option value="🎵">🎵 Music</mat-option>
            <mat-option value="🎨">🎨 Art</mat-option>
            <mat-option value="💼">💼 Business</mat-option>
            <mat-option value="🌟">🌟 General</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="date-time-row">
          <mat-form-field appearance="outline">
            <mat-label>Expiration Date</mat-label>
            <input matInput [matDatepicker]="expirationDatePicker" formControlName="expirationDate">
            <mat-datepicker-toggle matSuffix [for]="expirationDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #expirationDatePicker></mat-datepicker>
            <mat-error *ngIf="meetupForm.get('expirationDate')?.hasError('required')">
              Expiration date is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Expiration Time</mat-label>
            <input matInput type="time" formControlName="expirationTime">
            <mat-error *ngIf="meetupForm.get('expirationTime')?.hasError('required')">
              Expiration time is required
            </mat-error>
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="femaleOnly">
          Female Only Meetup
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="meetupForm.invalid || loading">
        {{ loading ? 'Creating...' : 'Create Meetup' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .meetup-form {
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
      .meetup-form {
        min-width: 300px;
      }

      .date-time-row,
      .location-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreateMeetupDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateMeetupDialogComponent>);
  private supabaseService = inject(SupabaseService);
  private snackBar = inject(MatSnackBar);

  loading = false;

  meetupForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
    maxParticipants: ['', [Validators.required, Validators.min(1)]],
    emoticon: ['🤝'],
    expirationDate: ['', Validators.required],
    expirationTime: ['', Validators.required],
    femaleOnly: [false]
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.meetupForm.invalid) {
      this.meetupForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const formValue = this.meetupForm.value;
      
      // Combine date and time for expiration
      const expirationDateTime = new Date(formValue.expirationDate);
      const [hours, minutes] = formValue.expirationTime.split(':');
      expirationDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Validate expiration is in the future
      if (expirationDateTime <= new Date()) {
        this.snackBar.open('Expiration time must be in the future', 'Close', { duration: 3000 });
        this.loading = false;
        return;
      }

      const meetupData = {
        title: formValue.title,
        description: formValue.description,
        latitude: parseFloat(formValue.latitude),
        longitude: parseFloat(formValue.longitude),
        max_participants: parseInt(formValue.maxParticipants),
        emoticon: formValue.emoticon,
        female_only: formValue.femaleOnly,
        expires_at: expirationDateTime.toISOString()
      };

      const newMeetup = await this.supabaseService.createMeetup(meetupData);
      
      this.snackBar.open('Meetup created successfully!', 'Close', { duration: 3000 });
      this.dialogRef.close(newMeetup);
    } catch (error) {
      console.error('Error creating meetup:', error);
      this.snackBar.open('Error creating meetup. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
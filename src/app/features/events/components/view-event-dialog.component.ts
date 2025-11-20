import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService, Event, UserProfile } from '../../../core/services/supabase.service';

interface EventWithDetails extends Event {
  creator: UserProfile;
  attendee_count: number;
}

interface EventDetails extends EventWithDetails {
  attendees: UserProfile[];
}

@Component({
  selector: 'app-view-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>{{ event.title }}</h2>
      <button mat-icon-button (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    
    <mat-dialog-content>
      <div class="event-details" *ngIf="!loading(); else loadingTemplate">
        <!-- Event Info Card -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>Event Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <strong>Description:</strong>
                <p>{{ event.description }}</p>
              </div>
              
              <div class="info-item">
                <strong>Creator:</strong>
                <p>{{ event.creator?.display_name }} ({{ event.creator?.email }})</p>
              </div>
              
              <div class="info-item">
                <strong>Date & Time:</strong>
                <p>{{ event.start_date_time | date:'fullDate' }}</p>
                <p>{{ event.start_date_time | date:'shortTime' }} - {{ event.end_date_time | date:'shortTime' }}</p>
              </div>
              
              <div class="info-item">
                <strong>Location:</strong>
                <p>{{ event.latitude?.toFixed(6) }}, {{ event.longitude?.toFixed(6) }}</p>
                <button mat-stroked-button (click)="openInMaps()">
                  <mat-icon>map</mat-icon>
                  View on Map
                </button>
              </div>
              
              <div class="info-item">
                <strong>Participants:</strong>
                <mat-chip-listbox>
                  <mat-chip>{{ event.attendee_count || 0 }} / {{ event.max_participants }}</mat-chip>
                </mat-chip-listbox>
              </div>
              
              <div class="info-item">
                <strong>Visibility:</strong>
                <mat-chip [class]="event.is_public ? 'public-chip' : 'private-chip'">
                  {{ event.is_public ? 'Public' : 'Private' }}
                </mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Attendees Card -->
        <mat-card class="attendees-card" *ngIf="eventDetails()?.attendees?.length">
          <mat-card-header>
            <mat-card-title>Attendees ({{ eventDetails()?.attendees?.length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="eventDetails()?.attendees || []" class="attendees-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let attendee">{{ attendee.display_name }}</td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let attendee">{{ attendee.email }}</td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let attendee">
                  <mat-chip [class]="getRoleChipClass(attendee.role)">
                    {{ attendee.role | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let attendee">
                  <mat-chip [class]="getStatusChipClass(attendee.status)">
                    {{ attendee.status | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="attendeeColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: attendeeColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- No Attendees Message -->
        <mat-card class="no-attendees-card" *ngIf="!eventDetails()?.attendees?.length">
          <mat-card-content>
            <div class="no-attendees-message">
              <mat-icon>people_outline</mat-icon>
              <p>No attendees registered for this event yet.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading event details...</p>
        </div>
      </ng-template>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Close</button>
      <button mat-raised-button color="primary" (click)="onEdit()">
        <mat-icon>edit</mat-icon>
        Edit Event
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .event-details {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 800px;
    }

    .info-card,
    .attendees-card,
    .no-attendees-card {
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item strong {
      color: rgba(0, 0, 0, 0.87);
      font-weight: 500;
    }

    .info-item p {
      margin: 0;
      color: rgba(0, 0, 0, 0.6);
    }

    .attendees-table {
      width: 100%;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
    }

    .no-attendees-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
    }

    .no-attendees-message mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .public-chip {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .private-chip {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .role-admin {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .role-moderator {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .role-user {
      background-color: #f5f5f5;
      color: #616161;
    }

    .status-active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-suspended {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-banned {
      background-color: #ffebee;
      color: #d32f2f;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    @media (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ViewEventDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ViewEventDialogComponent>);
  private supabaseService = inject(SupabaseService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  eventDetails = signal<EventDetails | null>(null);
  attendeeColumns = ['name', 'email', 'role', 'status'];

  constructor(@Inject(MAT_DIALOG_DATA) public event: EventWithDetails) {}

  async ngOnInit() {
    await this.loadEventDetails();
  }

  async loadEventDetails() {
    try {
      this.loading.set(true);
      const details = await this.supabaseService.getEventDetails(this.event.id, 'admin-user-id');
      // this.eventDetails.set(details);
    } catch (error) {
      console.error('Error loading event details:', error);
      this.snackBar.open('Error loading event details', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', event: this.event });
  }

  openInMaps(): void {
    const url = `https://www.google.com/maps?q=${this.event.latitude},${this.event.longitude}`;
    window.open(url, '_blank');
  }

  getRoleChipClass(role: string): string {
    return `role-${role}`;
  }

  getStatusChipClass(status: string): string {
    return `status-${status}`;
  }
}
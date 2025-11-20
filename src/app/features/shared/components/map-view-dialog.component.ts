import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface MapItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type: 'event' | 'meetup';
  description?: string;
  emoticon?: string;
  max_participants?: number;
  attendee_count?: number;
  participant_count?: number;
  start_date_time?: string;
  expires_at?: string;
}

@Component({
  selector: 'app-map-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>map</mat-icon>
        {{ item.type === 'event' ? 'Event' : 'Meetup' }} Location
      </h2>
      <button mat-icon-button (click)="onClose()" class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="map-container">
        <!-- Item Details Card -->
        <mat-card class="item-details">
          <mat-card-header>
            <mat-card-title>
              <span *ngIf="item.emoticon" class="emoticon">{{ item.emoticon }}</span>
              {{ item.title }}
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-row" *ngIf="item.description">
              <strong>Description:</strong>
              <p>{{ item.description }}</p>
            </div>
            
            <div class="detail-row">
              <strong>Coordinates:</strong>
              <p>{{ item.latitude.toFixed(6) }}, {{ item.longitude.toFixed(6) }}</p>
            </div>
            
            <div class="detail-row" *ngIf="item.max_participants">
              <strong>Participants:</strong>
              <mat-chip-listbox>
                <mat-chip>
                  {{ getParticipantCount() }} / {{ item.max_participants }}
                </mat-chip>
              </mat-chip-listbox>
            </div>
            
            <div class="detail-row" *ngIf="item.start_date_time">
              <strong>Start Time:</strong>
              <p>{{ item.start_date_time | date:'MMM d, y h:mm a' }}</p>
            </div>
            
            <div class="detail-row" *ngIf="item.expires_at">
              <strong>Expires:</strong>
              <p>{{ item.expires_at | date:'MMM d, y h:mm a' }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Map Placeholder -->
        <div class="map-placeholder">
          <div class="map-content">
            <mat-icon class="map-icon">location_on</mat-icon>
            <h3>Interactive Map</h3>
            <p>Map integration would be displayed here</p>
            <p class="coordinates">{{ item.latitude.toFixed(6) }}, {{ item.longitude.toFixed(6) }}</p>
            
            <!-- External Map Links -->
            <div class="map-actions">
              <button mat-raised-button color="primary" (click)="openInGoogleMaps()">
                <mat-icon>open_in_new</mat-icon>
                Google Maps
              </button>
              <button mat-raised-button (click)="openInAppleMaps()">
                <mat-icon>open_in_new</mat-icon>
                Apple Maps
              </button>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">Close</button>
      <button mat-raised-button color="primary" (click)="copyCoordinates()">
        <mat-icon>content_copy</mat-icon>
        Copy Coordinates
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px 0;
      border-bottom: 1px solid var(--mat-divider-color);
      margin-bottom: 16px;
    }

    .dialog-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-button {
      margin-left: auto;
    }

    .dialog-content {
      padding: 0 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .map-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      min-height: 400px;
    }

    .item-details {
      height: fit-content;
    }

    .detail-row {
      margin-bottom: 16px;
    }

    .detail-row strong {
      display: block;
      margin-bottom: 4px;
      color: var(--mat-sys-primary);
    }

    .detail-row p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .emoticon {
      font-size: 1.5em;
      margin-right: 8px;
    }

    .map-placeholder {
      background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--mat-sys-outline-variant);
      position: relative;
      overflow: hidden;
    }

    .map-content {
      text-align: center;
      padding: 32px;
    }

    .map-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-primary);
      margin-bottom: 16px;
    }

    .map-content h3 {
      margin: 0 0 8px 0;
      color: var(--mat-sys-on-surface);
    }

    .map-content p {
      margin: 0 0 8px 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .coordinates {
      font-family: monospace;
      background: var(--mat-sys-surface-container);
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
      margin: 16px 0;
    }

    .map-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .map-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MapViewDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<MapViewDialogComponent>);
  
  item: MapItem;
  loading = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { item: MapItem }) {
    this.item = data.item;
  }

  ngOnInit() {
    // Initialize map or perform any setup
  }

  getParticipantCount(): number {
    return this.item.attendee_count || this.item.participant_count || 0;
  }

  openInGoogleMaps() {
    const url = `https://www.google.com/maps?q=${this.item.latitude},${this.item.longitude}`;
    window.open(url, '_blank');
  }

  openInAppleMaps() {
    const url = `https://maps.apple.com/?q=${this.item.latitude},${this.item.longitude}`;
    window.open(url, '_blank');
  }

  copyCoordinates() {
    const coordinates = `${this.item.latitude.toFixed(6)}, ${this.item.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(coordinates).then(() => {
      // this.snackBar.open('Coordinates copied to clipboard!', 'Close', { duration: 3000 });
    });
  }

  onClose() {
    this.dialogRef.close();
  }

}
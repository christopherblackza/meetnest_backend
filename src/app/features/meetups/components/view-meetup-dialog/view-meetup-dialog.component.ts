import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService, Meetup } from '../../../../core/services/supabase.service';

interface MeetupWithDetails extends Meetup {
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  participants?: Array<{
    id: string;
    full_name: string;
    avatar_url?: string;
    joined_at: string;
  }>;
}

@Component({
  selector: 'app-view-meetup-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './view-meetup-dialog.component.html',
  styleUrl: './view-meetup-dialog.component.scss',
})
export class ViewMeetupDialogComponent {
  private dialogRef = inject(MatDialogRef<ViewMeetupDialogComponent>);
  private supabaseService = inject(SupabaseService);

  meetup: Meetup;
  meetupDetails: any | null = null;
  loadingParticipants = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { meetup: Meetup }) {
    this.meetup = data.meetup;
    this.loadMeetupDetails();
  }

  async loadMeetupDetails(): Promise<void> {
    this.loadingParticipants = true;
    
    try {
      // Load creator and participants details
      // Note: These methods would need to be implemented in SupabaseService

      const currentUserId = await this.supabaseService.getCurrentUserId() || '';
      // const adminUserId = this.supabaseService.getAdminUserId();

      const [creator, participants] = await Promise.all([
        this.supabaseService.getUserProfile(currentUserId, currentUserId),
        this.loadParticipants()
      ]);

      this.meetupDetails = {
        ...this.meetup,
        creator,
        participants
      };
    } catch (error) {
      console.error('Error loading meetup details:', error);
    } finally {
      this.loadingParticipants = false;
    }
  }

  private async loadParticipants(): Promise<any[]> {
    try {
      // This would need to be implemented in SupabaseService
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error loading participants:', error);
      return [];
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', meetup: this.meetup });
  }
}
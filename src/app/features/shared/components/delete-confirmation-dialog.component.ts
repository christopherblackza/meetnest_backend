import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface DeleteConfirmationData {
  title: string;
  message: string;
  itemName: string;
  itemType: 'event' | 'meetup' | 'user' | 'plan';
  warningMessage?: string;
  cascadeInfo?: string[];
}

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon class="warning-icon">warning</mat-icon>
        {{ data.title }}
      </h2>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="confirmation-message">
        <p>{{ data.message }}</p>
        
        <div class="item-info">
          <strong>{{ getItemTypeLabel() }}:</strong> {{ data.itemName }}
        </div>

        <div class="warning-section" *ngIf="data.warningMessage">
          <mat-icon class="warning-icon">error</mat-icon>
          <p>{{ data.warningMessage }}</p>
        </div>

        <div class="cascade-info" *ngIf="data.cascadeInfo && data.cascadeInfo.length > 0">
          <h4>This action will also:</h4>
          <ul>
            <li *ngFor="let info of data.cascadeInfo">{{ info }}</li>
          </ul>
        </div>

        <div class="final-warning">
          <strong>This action cannot be undone.</strong>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="isDeleting">
        Cancel
      </button>
      <button 
        mat-raised-button 
        color="warn" 
        (click)="onConfirm()" 
        [disabled]="isDeleting"
        class="delete-button">
        <mat-spinner *ngIf="isDeleting" diameter="20" class="spinner"></mat-spinner>
        <mat-icon *ngIf="!isDeleting">delete</mat-icon>
        {{ isDeleting ? 'Deleting...' : 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      padding: 16px 24px 0;
      border-bottom: 1px solid var(--mat-divider-color);
      margin-bottom: 16px;
    }

    .dialog-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-error);
    }

    .warning-icon {
      color: var(--mat-sys-error);
    }

    .dialog-content {
      padding: 0 24px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .confirmation-message {
      line-height: 1.6;
    }

    .item-info {
      background: var(--mat-sys-surface-container);
      padding: 12px;
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid var(--mat-sys-primary);
    }

    .warning-section {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      padding: 12px;
      border-radius: 8px;
      margin: 16px 0;
    }

    .warning-section p {
      margin: 0;
    }

    .cascade-info {
      background: var(--mat-sys-surface-container-high);
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }

    .cascade-info h4 {
      margin: 0 0 12px 0;
      color: var(--mat-sys-on-surface);
    }

    .cascade-info ul {
      margin: 0;
      padding-left: 20px;
    }

    .cascade-info li {
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
    }

    .final-warning {
      text-align: center;
      margin: 20px 0;
      padding: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 8px;
      font-weight: 500;
    }

    .delete-button {
      position: relative;
    }

    .spinner {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    .delete-button mat-icon {
      margin-right: 8px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      gap: 12px;
    }
  `]
})
export class DeleteConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<DeleteConfirmationDialogComponent>);
  
  isDeleting = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData) {}

  getItemTypeLabel(): string {
    switch (this.data.itemType) {
      case 'event': return 'Event';
      case 'meetup': return 'Meetup';
      case 'user': return 'User';
      case 'plan': return 'Plan';
      default: return 'Item';
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  async onConfirm() {
    this.isDeleting = true;
    // Simulate deletion process
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.dialogRef.close(true);
  }

}
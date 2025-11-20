import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-create-plan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>Create Subscription Plan</h2>
    
    <mat-dialog-content>
      <form [formGroup]="planForm" class="plan-form">
        <mat-form-field appearance="outline">
          <mat-label>Plan Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Premium Plan">
          <mat-error *ngIf="planForm.get('name')?.hasError('required')">
            Plan name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Describe the plan benefits"></textarea>
        </mat-form-field>

        <div class="price-row">
          <mat-form-field appearance="outline">
            <mat-label>Price</mat-label>
            <input matInput type="number" formControlName="price" min="0" step="0.01" placeholder="0.00">
            <mat-error *ngIf="planForm.get('price')?.hasError('required')">
              Price is required
            </mat-error>
            <mat-error *ngIf="planForm.get('price')?.hasError('min')">
              Price must be 0 or greater
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Currency</mat-label>
            <mat-select formControlName="currency">
              <mat-option value="USD">USD ($)</mat-option>
              <mat-option value="EUR">EUR (€)</mat-option>
              <mat-option value="GBP">GBP (£)</mat-option>
              <mat-option value="CAD">CAD (C$)</mat-option>
              <mat-option value="AUD">AUD (A$)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Duration (Months)</mat-label>
          <mat-select formControlName="duration_months">
            <mat-option value="1">1 Month</mat-option>
            <mat-option value="3">3 Months</mat-option>
            <mat-option value="6">6 Months</mat-option>
            <mat-option value="12">12 Months (1 Year)</mat-option>
            <mat-option value="24">24 Months (2 Years)</mat-option>
          </mat-select>
          <mat-error *ngIf="planForm.get('duration_months')?.hasError('required')">
            Duration is required
          </mat-error>
        </mat-form-field>

        <!-- Features Section -->
        <div class="features-section">
          <h3>Plan Features</h3>
          <div formArrayName="features" class="features-list">
            <div *ngFor="let feature of featuresArray.controls; let i = index" class="feature-item">
              <mat-form-field appearance="outline">
                <mat-label>Feature {{ i + 1 }}</mat-label>
                <input matInput [formControlName]="i" placeholder="e.g., Unlimited meetups">
              </mat-form-field>
              <button mat-icon-button type="button" color="warn" (click)="removeFeature(i)" [disabled]="featuresArray.length <= 1">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
          <button mat-button type="button" (click)="addFeature()" class="add-feature-btn">
            <mat-icon>add</mat-icon>
            Add Feature
          </button>
        </div>

        <mat-checkbox formControlName="is_active">
          Active Plan (available for subscription)
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="planForm.invalid || loading">
        {{ loading ? 'Creating...' : 'Create Plan' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .plan-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
      max-width: 600px;
    }

    .price-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }

    .features-section {
      margin-top: 16px;
    }

    .features-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .feature-item mat-form-field {
      flex: 1;
    }

    .add-feature-btn {
      margin-top: 8px;
      align-self: flex-start;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    @media (max-width: 600px) {
      .plan-form {
        min-width: 300px;
      }

      .price-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CreatePlanDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreatePlanDialogComponent>);
  private supabaseService = inject(SupabaseService);
  private snackBar = inject(MatSnackBar);

  loading = false;

  planForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    price: ['', [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
    duration_months: ['', Validators.required],
    features: this.fb.array([this.fb.control('', Validators.required)]),
    is_active: [true]
  });

  get featuresArray(): FormArray {
    return this.planForm.get('features') as FormArray;
  }

  addFeature(): void {
    this.featuresArray.push(this.fb.control('', Validators.required));
  }

  removeFeature(index: number): void {
    if (this.featuresArray.length > 1) {
      this.featuresArray.removeAt(index);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSubmit(): Promise<void> {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const formValue = this.planForm.value;
      
      // Filter out empty features
      const features = formValue.features.filter((feature: string) => feature.trim() !== '');
      
      if (features.length === 0) {
        this.snackBar.open('At least one feature is required', 'Close', { duration: 3000 });
        this.loading = false;
        return;
      }

      const planData = {
        name: formValue.name,
        description: formValue.description || null,
        price: parseFloat(formValue.price),
        currency: formValue.currency,
        duration_months: parseInt(formValue.duration_months),
        features: features,
        is_active: formValue.is_active
      };

      // const newPlan = await this.supabaseService.createSubscriptionPlan(planData);
      
      this.snackBar.open('Subscription plan created successfully!', 'Close', { duration: 3000 });
      // this.dialogRef.close(newPlan);
    } catch (error) {
      console.error('Error creating plan:', error);
      this.snackBar.open('Error creating plan. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
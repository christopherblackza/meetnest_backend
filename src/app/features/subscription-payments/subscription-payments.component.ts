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
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { SubscriptionPaymentsService } from './services/subscription-payments.service';
import {
  Plan,
  Subscription as LocalSubscription,
  Payment,
  SubscriptionStats,
  SubscriptionFilters
} from './models/subscription-payments.models';
import { SupabaseService, DataGridOptions, DataGridResult, Subscription as SupabaseSubscription, SubscriptionPlan, UserProfile } from '../../core/services/supabase.service';
import { CreatePlanDialogComponent } from './components/create-plan-dialog.component';
import { MatDialog } from '@angular/material/dialog';

// Extended types to match the data returned from the service
type ExtendedSubscription = SupabaseSubscription & { 
  plan: SubscriptionPlan; 
  user: UserProfile; 
};

@Component({
  selector: 'app-subscription-payments',
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
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="subscription-payments-container">
      <div class="header">
        <h1>Subscription & Payments</h1>
        <p>Manage subscription plans, user subscriptions, and payment analytics</p>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid" *ngIf="stats()">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>subscriptions</mat-icon>
              <div>
                <h3>{{ stats()?.active_subscriptions }}</h3>
                <p>Active Subscriptions</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>attach_money</mat-icon>
              <div>
                <h3>\${{ stats()?.total_revenue | number:'1.2-2' }}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>trending_up</mat-icon>
              <div>
                <h3>\${{ stats()?.monthly_revenue | number:'1.2-2' }}</h3>
                <p>Monthly Revenue</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>payment</mat-icon>
              <div>
                <h3>{{ stats()?.successful_payments }}</h3>
                <p>Successful Payments</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>error</mat-icon>
              <div>
                <h3>{{ stats()?.failed_payments }}</h3>
                <p>Failed Payments</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filtersForm" class="filters-form">
            <mat-form-field>
              <mat-label>Search</mat-label>
              <input matInput formControlName="search" placeholder="Search by user, plan, or transaction ID">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Plan</mat-label>
              <mat-select formControlName="plan_id">
                <mat-option value="">All Plans</mat-option>
                <mat-option *ngFor="let plan of plans()" [value]="plan.id">
                  {{ plan.name }} (\${{ plan.price }})
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Subscription Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="active">Active</mat-option>
                <mat-option value="past_due">Past Due</mat-option>
                <mat-option value="canceled">Canceled</mat-option>
                <mat-option value="trialing">Trialing</mat-option>
                <mat-option value="non_renewing">Non Renewing</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Payment Status</mat-label>
              <mat-select formControlName="payment_status">
                <mat-option value="">All Payment Statuses</mat-option>
                <mat-option value="completed">Completed</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="failed">Failed</mat-option>
                <mat-option value="refunded">Refunded</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Date From</mat-label>
              <input matInput [matDatepicker]="dateFromPicker" formControlName="date_from">
              <mat-datepicker-toggle matSuffix [for]="dateFromPicker"></mat-datepicker-toggle>
              <mat-datepicker #dateFromPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Date To</mat-label>
              <input matInput [matDatepicker]="dateToPicker" formControlName="date_to">
              <mat-datepicker-toggle matSuffix [for]="dateToPicker"></mat-datepicker-toggle>
              <mat-datepicker #dateToPicker></mat-datepicker>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>filter_list</mat-icon>
              Apply Filters
            </button>

            <button mat-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Clear
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Tabs for different sections -->
      <mat-tab-group class="feature-tabs">
        <!-- Plans Tab -->
        <mat-tab label="Plans">
          <div class="tab-content">
            <div class="tab-header">
              <h2>Subscription Plans</h2>
              <button mat-raised-button color="primary" (click)="createPlan()">
                <mat-icon>add</mat-icon>
                Add Plan
              </button>
            </div>

            <mat-table [dataSource]="plans()" class="feature-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let plan">{{ plan.name }}</td>
              </ng-container>

              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef>Price</th>
                <td mat-cell *matCellDef="let plan">
                  \${{ plan.price }} {{ plan.currency }}
                </td>
              </ng-container>

              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duration</th>
                <td mat-cell *matCellDef="let plan">
                  {{ plan.duration_months }} month(s)
                </td>
              </ng-container>

              <ng-container matColumnDef="features">
                <th mat-header-cell *matHeaderCellDef>Features</th>
                <td mat-cell *matCellDef="let plan">
                  <mat-chip-set>
                    <mat-chip *ngFor="let feature of plan.features?.slice(0, 2)">
                      {{ feature }}
                    </mat-chip>
                    <mat-chip *ngIf="plan.features && plan.features.length > 2">
                      +{{ plan.features.length - 2 }} more
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <ng-container matColumnDef="is_active">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let plan">
                  <mat-chip [color]="plan.is_active ? 'primary' : 'warn'">
                    {{ plan.is_active ? 'Active' : 'Inactive' }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let plan">
                  <button mat-icon-button color="primary">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" (click)="togglePlanStatus(plan)">
                    <mat-icon>{{ plan.is_active ? 'pause' : 'play_arrow' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="planColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: planColumns;"></tr>
            </mat-table>
          </div>
        </mat-tab>

        <!-- Subscriptions Tab -->
        <mat-tab label="Subscriptions">
          <div class="tab-content">
            <div class="tab-header">
              <h2>User Subscriptions</h2>
              <button mat-raised-button color="accent" (click)="exportSubscriptions()">
                <mat-icon>download</mat-icon>
                Export CSV
              </button>
            </div>

            <mat-table [dataSource]="subscriptions()" class="feature-table">
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let subscription">
                  <div class="user-info">
                    <div>
                      <div class="user-name">{{ subscription.user?.display_name || 'Unknown User' }}</div>
                      <div class="user-email">{{ subscription.user?.email }}</div>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="plan">
                <th mat-header-cell *matHeaderCellDef>Plan</th>
                <td mat-cell *matCellDef="let subscription">
                  <div>
                    <div class="plan-name">{{ subscription.plan?.name }}</div>
                    <div class="plan-price">\${{ (subscription.plan?.price_cents || 0) / 100 }} / {{ subscription.plan?.interval }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let subscription">
                  <mat-chip [color]="getSubscriptionStatusColor(subscription.status)">
                    {{ subscription.status | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="period">
                <th mat-header-cell *matHeaderCellDef>Period</th>
                <td mat-cell *matCellDef="let subscription">
                  <div class="subscription-period">
                    <div>{{ subscription.start_date | date:'mediumDate' }}</div>
                    <div>{{ subscription.cancel_at | date:'mediumDate' }}</div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="auto_renew">
                <th mat-header-cell *matHeaderCellDef>Provider ID</th>
                <td mat-cell *matCellDef="let subscription">
                  <code>{{ subscription.provider_subscription_id || 'N/A' }}</code>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let subscription">
                  <button mat-icon-button color="primary">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" [matMenuTriggerFor]="statusMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #statusMenu="matMenu">
                    <button mat-menu-item (click)="updateSubscriptionStatus(subscription, 'active')">
                      <mat-icon>play_arrow</mat-icon>
                      Activate
                    </button>
                    <button mat-menu-item (click)="updateSubscriptionStatus(subscription, 'canceled')">
                      <mat-icon>cancel</mat-icon>
                      Cancel
                    </button>
                    <button mat-menu-item (click)="updateSubscriptionStatus(subscription, 'past_due')">
                      <mat-icon>schedule</mat-icon>
                      Mark Past Due
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="subscriptionColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: subscriptionColumns;"></tr>
            </mat-table>
          </div>
        </mat-tab>

        <!-- Payments Tab -->
        <mat-tab label="Payments">
          <div class="tab-content">
            <div class="tab-header">
              <h2>Payment Transactions</h2>
            </div>

            <mat-table [dataSource]="payments()" class="feature-table">
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let payment">
                  {{ payment.user_profile?.display_name || 'Unknown User' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let payment">
                  <div class="payment-amount">
                    \${{ payment.amount | number:'1.2-2' }}
                    <span class="currency">{{ payment.currency }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let payment">
                  <mat-chip [color]="getPaymentStatusColor(payment.status)">
                    {{ payment.status | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="method">
                <th mat-header-cell *matHeaderCellDef>Method</th>
                <td mat-cell *matCellDef="let payment">
                  {{ payment.payment_method | titlecase }}
                </td>
              </ng-container>

              <ng-container matColumnDef="transaction_id">
                <th mat-header-cell *matHeaderCellDef>Transaction ID</th>
                <td mat-cell *matCellDef="let payment">
                  <code class="transaction-id">{{ payment.transaction_id || 'N/A' }}</code>
                </td>
              </ng-container>

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let payment">
                  {{ payment.created_at | date:'medium' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let payment">
                  <button mat-icon-button color="primary">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" *ngIf="payment.status === 'completed'">
                    <mat-icon>undo</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="paymentColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: paymentColumns;"></tr>
            </mat-table>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrls: ['./subscription-payments.component.scss']
})
export class SubscriptionPaymentsComponent implements OnInit {
  private subscriptionPaymentsService = inject(SubscriptionPaymentsService);
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals for reactive state
  loading = signal(false);
  stats = signal<SubscriptionStats | null>(null);
  plans = signal<Plan[]>([]);
  subscriptions = signal<ExtendedSubscription[]>([]);
  payments = signal<Payment[]>([]);
  
  // Data grid results
  subscriptionsResult = signal<DataGridResult<ExtendedSubscription> | null>(null);
  
  // Pagination and sorting
  currentPage = signal(0);
  pageSize = signal(10);
  sortBy = signal('start_date');
  sortOrder = signal<'asc' | 'desc'>('desc');

  filtersForm: FormGroup;
  currentFilters: SubscriptionFilters = {};

  planColumns = ['name', 'price', 'duration', 'features', 'is_active', 'actions'];
  subscriptionColumns = ['user', 'plan', 'status', 'period', 'auto_renew', 'actions'];
  paymentColumns = ['user', 'amount', 'status', 'method', 'transaction_id', 'created_at', 'actions'];

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      plan_id: [''],
      status: [''],
      payment_status: [''],
      date_from: [''],
      date_to: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    
    // Load stats
    this.subscriptionPaymentsService.getSubscriptionStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (error) => console.error('Error loading stats:', error)
    });

    this.loadPlans();
    this.loadSubscriptions();
    this.loadPayments();
  }

  private loadPlans(): void {
    this.subscriptionPaymentsService.getPlans(this.currentFilters).subscribe({
      next: (plans) => this.plans.set(plans),
      error: (error) => console.error('Error loading plans:', error)
    });
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          status: this.filtersForm.value.status || undefined,
          planId: this.filtersForm.value.plan_id || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getSubscriptionsGrid(options);
      this.subscriptionsResult.set(result);
      this.subscriptions.set(result.data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.snackBar.open('Error loading subscriptions', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private loadPayments(): void {
    this.subscriptionPaymentsService.getPayments(this.currentFilters).subscribe({
      next: (payments) => this.payments.set(payments),
      error: (error) => console.error('Error loading payments:', error)
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadSubscriptions();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadSubscriptions();
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
          planId: this.filtersForm.value.plan_id || undefined,
          dateFrom: this.filtersForm.value.date_from ? this.filtersForm.value.date_from.toISOString() : undefined,
          dateTo: this.filtersForm.value.date_to ? this.filtersForm.value.date_to.toISOString() : undefined
        }
      };

      const csvData = await this.supabaseService.exportToCSV('subscriptions', options);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Subscriptions exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
      this.snackBar.open('Error exporting subscriptions', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  togglePlanStatus(plan: Plan): void {
    // Implementation for toggling plan status
    console.log('Toggle plan status:', plan);
    this.snackBar.open(`Plan ${plan.name} status toggled`, 'Close', { duration: 3000 });
  }

  updateSubscriptionStatus(subscription: ExtendedSubscription, status: string): void {
    // Implementation for updating subscription status
    console.log('Update subscription status:', subscription, status);
    this.snackBar.open(`Subscription status updated to ${status}`, 'Close', { duration: 3000 });
  }

  getSubscriptionStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'primary';
      case 'trialing':
        return 'accent';
      case 'past_due':
        return 'warn';
      case 'canceled':
        return '';
      default:
        return '';
    }
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'failed':
        return 'warn';
      case 'refunded':
        return '';
      default:
        return '';
    }
  }

  exportSubscriptions(): void {
    this.exportToCsv();
  }

  createPlan(): void {
    const dialogRef = this.dialog.open(CreatePlanDialogComponent, {
      width: '600px',
      maxWidth: '90vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPlans();
        this.snackBar.open('Plan created successfully!', 'Close', { duration: 3000 });
      }
    });
  }
}
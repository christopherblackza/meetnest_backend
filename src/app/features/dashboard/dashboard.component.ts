import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
// Removed NgChartsModule import as it's not available
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SupabaseService, AnalyticsOverview } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil, startWith, switchMap } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface KPICard {
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
  color: string;
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    // Removed NgChartsModule from imports
    ReactiveFormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Signals for reactive state management
  loading = signal(true);
  analyticsData = signal<AnalyticsOverview | null>(null);
  
  // Form controls
  dateRangeControl = new FormControl('week');
  startDateControl = new FormControl();
  endDateControl = new FormControl();
  
  // Chart options
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { display: true }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true }
    }
  };

  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // Computed properties for KPI cards
  kpiCards = computed(() => {
    const data = this.analyticsData();
    if (!data) return [];

    return [
      {
        title: 'Total Users',
        value: data.total_users,
        change: this.calculateGrowthRate(data.new_users_30d, data.total_users),
        changeType: 'increase' as const,
        icon: 'people',
        color: 'primary',
        route: '/user-management'
      },
      {
        title: 'Active Users',
        value: data.active_users,
        change: Math.round((data.active_users / data.total_users) * 100),
        changeType: 'increase' as const,
        icon: 'trending_up',
        color: 'success',
        route: '/user-management'
      },
      {
        title: 'Total Subscriptions',
        value: data.total_subscriptions,
        change: data.total_subscriptions,
        changeType: data.growth_rate >= 0 ? 'increase' as const : 'decrease' as const,
        icon: 'attach_money',
        color: 'accent',
        route: '/subscription-payments'
      },
      {
        title: 'Total Reports',
        value: data.total_reports,
        change: Math.round(((data.reports_opened - data.reports_resolved) / Math.max(data.reports_opened, 1)) * 100),
        changeType: 'warn' as const,
        icon: 'report_problem',
        color: 'warn',
        route: '/content-moderation'
      }
    ];
  });

  // Chart data computed properties
  userGrowthChartData = computed((): ChartData<'line'> => {
    const data = this.analyticsData();
    if (!data) return { labels: [], datasets: [] };

    return {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'New Users',
          data: [data.new_users_7d * 0.7, data.new_users_7d * 0.9, data.new_users_7d * 1.1, data.new_users_7d],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4
        },
        {
          label: 'Active Users',
          data: [data.active_users * 0.8, data.active_users * 0.85, data.active_users * 0.95, data.active_users],
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4
        }
      ]
    };
  });

  revenueChartData = computed((): ChartData<'bar'> => {
    const data = this.analyticsData();
    if (!data) return { labels: [], datasets: [] };

    return {
      labels: ['Subscriptions', 'Premium Features', 'Events', 'Other'],
      datasets: [
        {
          label: 'Revenue ($)',
          data: [
            // data.total_revenue * 0.7 / 100,
            // data.total_revenue * 0.2 / 100,
            // data.total_revenue * 0.08 / 100,
            // data.total_revenue * 0.02 / 100
          ],
          backgroundColor: ['#1976d2', '#ff4081', '#ff9800', '#4caf50']
        }
      ]
    };
  });

  activityChartData = computed((): ChartData<'doughnut'> => {
    const data = this.analyticsData();
    if (!data) return { labels: [], datasets: [] };

    return {
      labels: ['Events Created', 'Meetups Created'],
      datasets: [
        {
          data: [data.events_created, data.meetups_created],
          backgroundColor: ['#1976d2', '#ff4081']
        }
      ]
    };
  });

  moderationChartData = computed((): ChartData<'pie'> => {
    const data = this.analyticsData();
    if (!data) return { labels: [], datasets: [] };

    const pending = data.reports_opened - data.reports_resolved;
    const resolved = data.reports_resolved;

    return {
      labels: ['Pending Reports', 'Resolved Reports'],
      datasets: [
        {
          data: [pending, resolved],
          backgroundColor: ['#ff9800', '#4caf50']
        }
      ]
    };
  });

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    
    // Set up auto-refresh every 5 minutes
    interval(300000)
      .pipe(
        startWith(0),
        switchMap(() => this.loadAnalyticsData()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadDashboardData() {
    this.loading.set(true);
    try {
      await this.loadAnalyticsData();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Show user-friendly error message
      this.showErrorMessage('Failed to load dashboard data. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  private showErrorMessage(message: string) {
    // For now, just log to console. In a real app, you'd use a toast/snackbar service
    console.warn('User message:', message);
  }

  private async loadAnalyticsData() {
    try {
      const dateRange = this.dateRangeControl.value as 'week' | 'month';
      const startDate = this.startDateControl.value?.toISOString().split('T')[0];
      const endDate = this.endDateControl.value?.toISOString().split('T')[0];
      
      const data = await this.supabaseService.getAnalyticsOverview(dateRange, startDate, endDate);
      console.error('DATA', data);
      // Extract the first element from the array since the service returns an array
      this.analyticsData.set(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      this.analyticsData.set(null);
      // You could add a toast notification here to inform the user
      throw error;
    }
  }

  onDateRangeChange() {
    if (this.dateRangeControl.value !== 'custom') {
      this.loadAnalyticsData();
    }
  }

  applyCustomDateRange() {
    if (this.startDateControl.value && this.endDateControl.value) {
      this.loadAnalyticsData();
    }
  }

  navigateToModule(route?: string) {
    if (route) {
      this.router.navigate([route]);
    }
  }

  async exportData() {
    try {
      const data = await this.supabaseService.exportAnalyticsData('csv', 'overview');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }

  formatKPIValue(value: number | string): string {
    if (typeof value === 'string') return value;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value?.toString();
  }

  getChangeIcon(changeType: string): string {
    switch (changeType) {
      case 'increase': return 'trending_up';
      case 'decrease': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  private calculateGrowthRate(newUsers: number, totalUsers: number): number {
    return Math.round((newUsers / Math.max(totalUsers - newUsers, 1)) * 100);
  }

  // Expose Math for template
  Math = Math;
}
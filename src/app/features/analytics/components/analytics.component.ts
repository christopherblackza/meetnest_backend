import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService } from '../services/analytics.service.base';
import {
  AnalyticsOverview,
  UserAnalytics,
  RevenueAnalytics,
  ContentAnalytics,
  AnalyticsFilters
} from '../models/analytics.models';
import { MatMenuModule } from '@angular/material/menu';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  filterForm: FormGroup;
  loading = false;
  
  overview: AnalyticsOverview | null = null;
  userAnalytics: UserAnalytics | null = null;
  revenueAnalytics: RevenueAnalytics | null = null;
  contentAnalytics: ContentAnalytics | null = null;

  userGrowthChart: Chart | null = null;
  revenueChart: Chart | null = null;
  contentChart: Chart | null = null;

  constructor(
    private fb: FormBuilder,
    private analyticsService: AnalyticsService
  ) {
    this.filterForm = this.fb.group({
      date_range: ['month'],
      start_date: [''],
      end_date: [''],
      metric_type: ['overview']
    });
  }

  ngOnInit() {
    this.loadAnalytics();
    this.filterForm.valueChanges.subscribe(() => {
      this.loadAnalytics();
    });
  }

  loadAnalytics() {
    this.loading = true;
    const filters: AnalyticsFilters = this.filterForm.value;

    Promise.all([
      this.analyticsService.getAnalyticsOverview(filters).toPromise(),
      this.analyticsService.getUserAnalytics(filters).toPromise(),
      this.analyticsService.getRevenueAnalytics(filters).toPromise(),
      this.analyticsService.getContentAnalytics(filters).toPromise()
    ]).then(([overview, userAnalytics, revenueAnalytics, contentAnalytics]) => {
      this.overview = overview || null;
      this.userAnalytics = userAnalytics || null;
      this.revenueAnalytics = revenueAnalytics || null;
      this.contentAnalytics = contentAnalytics || null;
      
      this.updateCharts();
      this.loading = false;
    }).catch(error => {
      console.error('Error loading analytics:', error);
      this.showErrorMessage('Failed to load analytics data. Please try again later.');
      this.loading = false;
    });
  }

  updateCharts() {
    if (this.userAnalytics) {
      this.createUserGrowthChart();
    }
    if (this.revenueAnalytics) {
      this.createRevenueChart();
    }
    if (this.contentAnalytics) {
      this.createContentChart();
    }
  }

  createUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart') as HTMLCanvasElement;
    if (ctx && this.userAnalytics) {
      if (this.userGrowthChart) {
        this.userGrowthChart.destroy();
      }
      
      this.userGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.userAnalytics.user_growth_data.map(d => d.label),
          datasets: [{
            label: 'User Growth',
            data: this.userAnalytics.user_growth_data.map(d => d.value),
            borderColor: '#3f51b5',
            backgroundColor: 'rgba(63, 81, 181, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'User Growth Over Time'
            }
          }
        }
      });
    }
  }

  createRevenueChart() {
    const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (ctx && this.revenueAnalytics) {
      if (this.revenueChart) {
        this.revenueChart.destroy();
      }
      
      this.revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.revenueAnalytics.revenue_chart_data.map(d => d.label),
          datasets: [{
            label: 'Revenue ($)',
            data: this.revenueAnalytics.revenue_chart_data.map(d => d.value),
            backgroundColor: '#4caf50',
            borderColor: '#388e3c',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Revenue Trends'
            }
          }
        }
      });
    }
  }

  createContentChart() {
    const ctx = document.getElementById('contentChart') as HTMLCanvasElement;
    if (ctx && this.contentAnalytics) {
      if (this.contentChart) {
        this.contentChart.destroy();
      }
      
      this.contentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Meetups', 'Events', 'Chats'],
          datasets: [{
            data: [
              this.contentAnalytics.total_meetups,
              this.contentAnalytics.total_events,
              this.contentAnalytics.total_chats
            ],
            backgroundColor: ['#ff9800', '#2196f3', '#9c27b0']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Content Distribution'
            }
          }
        }
      });
    }
  }

  exportData(format: 'pdf' | 'excel' | 'csv') {
    const options = {
      format,
      data_type: 'overview' as const,
      date_range: this.filterForm.get('date_range')?.value || 'month'
    };

    this.analyticsService.exportData(options).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  refreshData() {
    this.loadAnalytics();
  }

  private showErrorMessage(message: string) {
    // For now, just log to console. In a real app, you'd use a toast/snackbar service
    console.warn('User message:', message);
  }
}
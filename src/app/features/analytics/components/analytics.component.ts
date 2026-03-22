import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService } from '../services/analytics.service.base';
import {
  AnalyticsOverview,
  UserAnalytics,
  RevenueAnalytics,
  ContentAnalytics,
  AnalyticsFilters
} from '../models/analytics.models';

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
    MatFormFieldModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  dateRangeControl = new FormControl<string>('month');
  loading = false;

  overview: AnalyticsOverview | null = null;
  userAnalytics: UserAnalytics | null = null;
  revenueAnalytics: RevenueAnalytics | null = null;
  contentAnalytics: ContentAnalytics | null = null;

  userGrowthChart: Chart | null = null;
  contentChart: Chart | null = null;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loadAnalytics();
    this.dateRangeControl.valueChanges.subscribe(() => {
      this.loadAnalytics();
    });
  }

  loadAnalytics() {
    this.loading = true;
    const filters: AnalyticsFilters = {
      date_range: (this.dateRangeControl.value as any) || 'month',
      metric_type: 'overview'
    };

    Promise.all([
      this.analyticsService.getAnalyticsOverview(filters).toPromise(),
      this.analyticsService.getUserAnalytics(filters).toPromise(),
      this.analyticsService.getContentAnalytics(filters).toPromise()
    ]).then(([overview, userAnalytics, contentAnalytics]) => {
      this.overview = overview || null;
      this.userAnalytics = userAnalytics || null;
      this.contentAnalytics = contentAnalytics || null;
      setTimeout(() => this.updateCharts(), 100);
      this.loading = false;
    }).catch(error => {
      console.error('Error loading analytics:', error);
      this.loading = false;
    });
  }

  updateCharts() {
    if (this.userAnalytics?.user_growth_data?.length) {
      this.createUserGrowthChart();
    }
    if (this.contentAnalytics) {
      this.createContentChart();
    }
  }

  createUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart') as HTMLCanvasElement;
    if (!ctx || !this.userAnalytics) return;

    if (this.userGrowthChart) this.userGrowthChart.destroy();

    this.userGrowthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.userAnalytics.user_growth_data.map(d => d.label),
        datasets: [{
          label: 'New Users',
          data: this.userAnalytics.user_growth_data.map(d => d.value),
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, grid: { color: '#f5f5f5' }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  createContentChart() {
    const ctx = document.getElementById('contentChart') as HTMLCanvasElement;
    if (!ctx || !this.contentAnalytics) return;

    if (this.contentChart) this.contentChart.destroy();

    this.contentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Blends', 'Chats', 'Messages'],
        datasets: [{
          data: [
            this.contentAnalytics.total_blends || 0,
            this.contentAnalytics.total_chats,
            this.contentAnalytics.total_messages || 0,
          ],
          backgroundColor: ['#f59e0b', '#7c3aed', '#6366f1'],
          borderWidth: 0,
          hoverOffset: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
          }
        }
      }
    });
  }

  exportData(format: 'pdf' | 'excel' | 'csv') {
    const options = {
      format,
      data_type: 'overview' as const,
      date_range: this.dateRangeControl.value || 'month'
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

  formatHours(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  }
}

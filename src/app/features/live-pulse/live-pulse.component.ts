import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../core/services/supabase.service';
import * as L from 'leaflet';

export interface LivePulseData {
  summary: {
    online_now: number;
    activities_today: number;
    signups_today: number;
    connections_today: number;
    messages_today: number;
  };
  active_users: { user_id: string; display_name: string; avatar_url: string; latitude: number; longitude: number; current_city: string }[] | null;
  active_activities: { id: string; title: string; type: string; latitude: number; longitude: number; location_name: string; participant_count: number }[] | null;
  hotspots: { lat: number; lng: number; activity_count: number }[] | null;
  feed: FeedItem[] | null;
}

export interface FeedItem {
  event_type: 'signup' | 'activity' | 'connection';
  id: string;
  title: string;
  image: string | null;
  subtitle: string;
  created_at: string;
}

@Component({
  selector: 'app-live-pulse',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './live-pulse.component.html',
  styleUrls: ['./live-pulse.component.scss']
})
export class LivePulseComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);

  data = signal<LivePulseData | null>(null);
  loading = signal(true);
  lastUpdated = signal<Date | null>(null);

  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  private hotspotsLayer = L.layerGroup();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  ngOnInit() {
    this.initMap();
    this.loadData();
    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => this.loadData(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) this.map.remove();
  }

  private initMap() {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.hotspotsLayer.addTo(this.map);
  }

  async loadData() {
    try {
      const { data, error } = await this.supabase.client.rpc('get_live_pulse');
      if (error) throw error;

      this.data.set(data as LivePulseData);
      this.lastUpdated.set(new Date());
      this.updateMap();
    } catch (err) {
      console.error('Error loading live pulse:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private updateMap() {
    const pulse = this.data();
    if (!pulse || !this.map) return;

    this.markersLayer.clearLayers();
    this.hotspotsLayer.clearLayers();

    // Active users — small pulsing cyan dots
    (pulse.active_users || []).forEach(user => {
      const marker = L.circleMarker([user.latitude, user.longitude], {
        radius: 4,
        fillColor: '#06b6d4',
        color: '#06b6d4',
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.7,
        className: 'pulse-dot',
      });
      marker.bindTooltip(user.display_name || 'User', { direction: 'top', offset: [0, -6] });
      this.markersLayer.addLayer(marker);
    });

    // Active blends — larger colored dots
    (pulse.active_activities || []).forEach(activity => {
      const color = '#f472b6';
      const marker = L.circleMarker([activity.latitude, activity.longitude], {
        radius: 6,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
        className: 'pulse-dot',
      });
      const label = `${activity.title || activity.type} (${activity.participant_count} joined)`;
      marker.bindTooltip(label, { direction: 'top', offset: [0, -8] });
      this.markersLayer.addLayer(marker);
    });

    // Hotspots — translucent circles sized by activity count
    (pulse.hotspots || []).forEach(h => {
      const circle = L.circle([h.lat, h.lng], {
        radius: Math.min(h.activity_count * 15000, 200000),
        fillColor: '#7c3aed',
        color: '#7c3aed',
        weight: 0,
        fillOpacity: 0.15 + Math.min(h.activity_count * 0.03, 0.25),
      });
      circle.bindTooltip(`${h.activity_count} activities this week`, { direction: 'top' });
      this.hotspotsLayer.addLayer(circle);
    });
  }

  getFeedIcon(type: string): string {
    switch (type) {
      case 'signup': return 'person_add';
      case 'activity': return 'event';
      case 'connection': return 'handshake';
      default: return 'circle';
    }
  }

  getFeedColor(type: string): string {
    switch (type) {
      case 'signup': return 'signup';
      case 'activity': return 'activity';
      case 'connection': return 'connection';
      default: return '';
    }
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  refresh() {
    this.loading.set(true);
    this.loadData();
  }
}

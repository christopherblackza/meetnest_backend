import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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

export interface AdventureTemplate {
  id: string;
  city: string;
  title: string;
  description: string;
  emoji: string;
  activity_type: string;
  intent: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  suggested_duration_minutes: number;
  suggested_time_label: string;
  min_group_size: number;
  max_participants: number;
  solo_xp: number;
  host_create_xp: number;
  attendance_xp: number;
  group_bonus_xp: number;
  badge_name: string | null;
  badge_icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
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
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './live-pulse.component.html',
  styleUrls: ['./live-pulse.component.scss']
})
export class LivePulseComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  data = signal<LivePulseData | null>(null);
  loading = signal(true);
  lastUpdated = signal<Date | null>(null);

  templates = signal<AdventureTemplate[]>([]);
  selectedTemplate = signal<AdventureTemplate | null>(null);
  editDraft = signal<AdventureTemplate | null>(null);
  saving = signal(false);
  moveMode = signal(false);

  readonly intentOptions = ['active', 'explore', 'social', 'chill', 'romantic', 'cultural', 'foodie'];
  readonly activityTypeOptions = ['blend', 'solo', 'group'];

  private map: L.Map | null = null;
  private markersLayer = L.layerGroup();
  private hotspotsLayer = L.layerGroup();
  private templatesLayer = L.layerGroup();
  private templateMarkers = new Map<string, L.Marker>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  ngOnInit() {
    this.initMap();
    this.loadData();
    this.loadTemplates();
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.hotspotsLayer.addTo(this.map);
    this.templatesLayer.addTo(this.map);
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

  async loadTemplates() {
    const { data, error } = await this.supabase.client
      .from('adventure_templates')
      .select('*')
      .order('sort_order');
    if (error) { console.error('Error loading templates:', error); return; }
    this.templates.set((data as AdventureTemplate[]) || []);
    this.renderTemplates();
  }

  private renderTemplates() {
    if (!this.map) return;
    this.templatesLayer.clearLayers();
    this.templateMarkers.clear();

    this.templates().forEach(t => {
      const icon = L.divIcon({
        html: `<div class="adventure-marker ${t.is_active ? 'active' : 'inactive'}">${t.emoji}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([t.latitude, t.longitude], { icon, draggable: false });

      const circle = L.circle([t.latitude, t.longitude], {
        radius: t.radius_meters,
        color: '#f97316',
        fillColor: '#f97316',
        weight: 1.5,
        fillOpacity: 0.08,
        dashArray: '4 4',
      });

      marker.bindTooltip(`${t.emoji} ${t.title}`, { direction: 'top', offset: [0, -22] });

      marker.on('click', () => {
        if (this.moveMode()) return;
        this.map?.flyTo([t.latitude, t.longitude], 13, { duration: 0.8 });
        this.openEdit(t);
      });

      marker.on('dragstart', () => {
        circle.setStyle({ fillOpacity: 0.18 });
        marker.closeTooltip();
      });

      marker.on('drag', (e: L.LeafletEvent) => {
        const { lat, lng } = (e as L.LeafletMouseEvent).latlng;
        circle.setLatLng([lat, lng]);
      });

      marker.on('dragend', async (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        circle.setLatLng([lat, lng]);
        circle.setStyle({ fillOpacity: 0.08 });
        await this.savePosition(t.id, lat, lng);
        this.templates.update(list =>
          list.map(item => item.id === t.id ? { ...item, latitude: lat, longitude: lng } : item)
        );
        if (this.selectedTemplate()?.id === t.id) {
          this.selectedTemplate.update(s => s ? { ...s, latitude: lat, longitude: lng } : s);
          this.editDraft.update(d => d ? { ...d, latitude: lat, longitude: lng } : d);
        }
      });

      this.templateMarkers.set(t.id, marker);
      this.templatesLayer.addLayer(circle);
      this.templatesLayer.addLayer(marker);
    });

    this.applyMoveMode();
  }

  toggleMoveMode() {
    this.moveMode.update(v => !v);
    this.applyMoveMode();
    if (this.moveMode()) this.closeEdit();
  }

  private applyMoveMode() {
    const enabled = this.moveMode();
    this.templateMarkers.forEach(marker => {
      if (enabled) {
        marker.dragging?.enable();
      } else {
        marker.dragging?.disable();
      }
    });
    const canvas = this.mapContainer?.nativeElement as HTMLElement | undefined;
    if (canvas) {
      canvas.classList.toggle('move-mode', enabled);
    }
  }

  private async savePosition(id: string, lat: number, lng: number) {
    const { error } = await this.supabase.client
      .from('adventure_templates')
      .update({ latitude: lat, longitude: lng })
      .eq('id', id);
    if (error) console.error('Failed to save position:', error);
  }

  openEdit(template: AdventureTemplate) {
    this.selectedTemplate.set(template);
    this.editDraft.set({ ...template });
  }

  closeEdit() {
    this.selectedTemplate.set(null);
    this.editDraft.set(null);
  }

  updateDraft(field: keyof AdventureTemplate, value: unknown) {
    this.editDraft.update(d => d ? { ...d, [field]: value } : d);
  }

  async saveEdit() {
    const draft = this.editDraft();
    if (!draft) return;
    this.saving.set(true);
    const { id, created_at, ...fields } = draft;
    const { error } = await this.supabase.client
      .from('adventure_templates')
      .update(fields)
      .eq('id', id);
    this.saving.set(false);
    if (error) { console.error('Save failed:', error); return; }
    this.templates.update(list => list.map(t => t.id === id ? { ...draft } : t));
    this.selectedTemplate.set({ ...draft });
    this.renderTemplates();
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

  goToMessages() {
    const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    this.router.navigate(['/messaging'], { queryParams: { dateFrom } });
  }
}

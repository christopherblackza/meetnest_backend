import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { ClientService } from '../services/client.service.base';
import { Client } from '../../../core/models/client.model';

@Component({
  selector: 'app-clients-map',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './clients-map.component.html',
  styleUrls: ['./clients-map.component.scss'],
})
export class ClientsMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapContainer!: ElementRef;

  private clientService = inject(ClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private map!: L.Map;
  private focusLat: number | null = null;
  private focusLng: number | null = null;

  isLoading = signal(true);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['lat'] && params['lng']) {
      this.focusLat = Number(params['lat']);
      this.focusLng = Number(params['lng']);
    }
    this.initMap();
    this.loadClients();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false,
    }).setView([40, -30], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.addMarkers(clients);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading clients:', err);
        this.isLoading.set(false);
      },
    });
  }

  private addMarkers(clients: Client[]): void {
    const bounds: L.LatLngExpression[] = [];
    let focusedMarker: L.Marker | null = null;
    const clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          className: 'client-cluster',
          html: `<span>${count}</span>`,
          iconSize: [40, 40],
        });
      },
    });

    for (const client of clients) {
      const lat = Number(client.latitude);
      const lng = Number(client.longitude);
      if (!lat && !lng) continue;

      bounds.push([lat, lng]);

      const icon = this.createClientIcon(client);
      const marker = L.marker([lat, lng], { icon });

      const popupHtml = `
        <div class="client-popup">
          <strong>${this.escapeHtml(client.name)}</strong>
          <span class="popup-type">${this.escapeHtml(client.type)}</span>
          ${client.address ? `<span class="popup-address">${this.escapeHtml(client.address)}</span>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);
      clusterGroup.addLayer(marker);

      if (
        this.focusLat !== null &&
        this.focusLng !== null &&
        Math.abs(lat - this.focusLat) < 0.0001 &&
        Math.abs(lng - this.focusLng) < 0.0001
      ) {
        focusedMarker = marker;
      }
    }

    this.map.addLayer(clusterGroup);

    if (focusedMarker) {
      const fl = focusedMarker.getLatLng();
      this.map.setView(fl, 16);
      setTimeout(() => focusedMarker!.openPopup(), 300);
    } else if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }

  private createClientIcon(client: Client): L.DivIcon {
    const size = 44;

    if (client.logo_url) {
      return L.divIcon({
        className: 'client-marker',
        html: `<img src="${this.escapeHtml(client.logo_url)}" alt="${this.escapeHtml(client.name)}" />`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 4)],
      });
    }

    return L.divIcon({
      className: 'client-marker client-marker--fallback',
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2 + 4)],
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}

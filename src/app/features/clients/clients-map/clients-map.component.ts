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
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
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
  private map!: L.Map;

  isLoading = signal(true);

  ngOnInit(): void {
    this.initMap();
    this.loadClients();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([40, -30], 3);

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

    for (const client of clients) {
      const lat = Number(client.latitude);
      const lng = Number(client.longitude);
      if (!lat && !lng) continue;

      bounds.push([lat, lng]);

      const icon = this.createClientIcon(client);
      const marker = L.marker([lat, lng], { icon }).addTo(this.map);

      const popupHtml = `
        <div class="client-popup">
          <strong>${this.escapeHtml(client.name)}</strong>
          <span class="popup-type">${this.escapeHtml(client.type)}</span>
          ${client.address ? `<span class="popup-address">${this.escapeHtml(client.address)}</span>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);
    }

    if (bounds.length > 0) {
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
      html: `<span>${this.escapeHtml(client.name.charAt(0).toUpperCase())}</span>`,
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

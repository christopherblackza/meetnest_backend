import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import * as L from 'leaflet';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { NominatimService } from '../../services/nominatim.service';

@Component({
  selector: 'app-map-selector',
  templateUrl: './map-selector.component.html',
  styleUrls: ['./map-selector.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatInputModule, MatListModule]
})
export class MapSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapContainer!: ElementRef;
  @Input() initialLat: number = 51.505;
  @Input() initialLng: number = -0.09;
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number; address?: string }>();
  @Output() close = new EventEmitter<void>();

  private nominatimService = inject(NominatimService);
  private map!: L.Map;
  private marker!: L.Marker;
  currentLat: number = 0;
  currentLng: number = 0;

  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  userCountryCode: string | null = null;
  private selectedPlaceName: string | null = null;
  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.currentLat = this.initialLat;
    this.currentLng = this.initialLng;
    this.fixLeafletIcons();
    this.setupSearch();
    this.getUserLocation();
  }

  getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.updateMapLocation(latitude, longitude);
          this.detectCountry(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation denied or error:', error);
        }
      );
    }
  }

  private updateMapLocation(lat: number, lng: number) {
    this.currentLat = lat;
    this.currentLng = lng;
    // Emit location immediately when located by GPS? Maybe not, let user confirm.
    
    if (this.map && this.marker) {
      this.map.setView([lat, lng], 13);
      this.marker.setLatLng([lat, lng]);
    }
  }

  private detectCountry(lat: number, lng: number): void {
    this.nominatimService.reverseGeocode(lat, lng).subscribe((result) => {
      if (result?.address?.['country_code']) {
        this.userCountryCode = result.address['country_code'];
      }
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      tap(() => this.isSearching = true),
      switchMap(query => {
        if (!query || query.length < 3) {
          return of([]);
        }
        return this.nominatimService.search(query, {
          countryCode: this.userCountryCode ?? undefined,
          limit: 15,
        });
      })
    ).subscribe(results => {
      this.searchResults = results;
      this.isSearching = false;
    });
  }

  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;
    if (query.length >= 3) {
      this.searchSubject.next(query);
    } else {
      this.searchResults = [];
    }
  }

  private fixLeafletIcons(): void {
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    L.Marker.prototype.options.icon = iconDefault;
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // Small timeout to ensure container has dimensions
    setTimeout(() => {
      this.map = L.map(this.mapContainer.nativeElement).setView([this.initialLat, this.initialLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.marker = L.marker([this.initialLat, this.initialLng], { draggable: true }).addTo(this.map);

      this.marker.on('dragend', (event) => {
        const { lat, lng } = event.target.getLatLng();
        this.currentLat = lat;
        this.currentLng = lng;
        this.selectedPlaceName = null;
      });

      this.map.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        this.marker.setLatLng([lat, lng]);
        this.currentLat = lat;
        this.currentLng = lng;
        this.selectedPlaceName = null;
      });

      // Force map resize check
      this.map.invalidateSize();
    }, 100);
  }

  // Legacy method kept for button click, but now delegates to subject
  async searchPlaces() {
    if (this.searchQuery && this.searchQuery.length >= 3) {
      this.searchSubject.next(this.searchQuery);
    }
  }

  selectPlace(place: any) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    this.currentLat = lat;
    this.currentLng = lng;
    this.selectedPlaceName = place.display_name;

    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], 16);
    this.searchResults = [];
    this.searchQuery = '';
  }

  confirmLocation(): void {
    this.locationSelected.emit({
      lat: this.currentLat,
      lng: this.currentLng,
      address: this.selectedPlaceName ?? undefined,
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
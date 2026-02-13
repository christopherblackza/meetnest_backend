import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import * as L from 'leaflet';
import { Subject, from, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';

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
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number }>();
  @Output() close = new EventEmitter<void>();

  private map!: L.Map;
  private marker!: L.Marker;
  currentLat: number = 0;
  currentLng: number = 0;

  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  userCountryCode: string | null = null;
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

  private async detectCountry(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data?.address?.country_code) {
        this.userCountryCode = data.address.country_code;
        console.log('User detected country:', this.userCountryCode);
      }
    } catch (e) {
      console.error('Failed to detect country', e);
    }
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
        
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=15`;
        if (this.userCountryCode) {
          url += `&countrycodes=${this.userCountryCode}`;
        }
        
        console.log('Search URL:', url);
        return from(
          fetch(url)
            .then(res => res.json())
        ).pipe(
          catchError(error => {
            console.error('Error searching places:', error);
            return of([]);
          })
        );
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
      });
      
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        this.marker.setLatLng([lat, lng]);
        this.currentLat = lat;
        this.currentLng = lng;
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
    
    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], 16);
    this.searchResults = [];
    this.searchQuery = ''; // Optional: clear search query or keep it
  }

  confirmLocation(): void {
    this.locationSelected.emit({ lat: this.currentLat, lng: this.currentLng });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
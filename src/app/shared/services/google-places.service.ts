import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlaceResult {
  place_id: string;
  display_name: string;
  lat: number;
  lng: number;
  google_maps_link: string;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class GooglePlacesService {
  private ngZone = inject(NgZone);
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private scriptLoaded = false;
  private scriptLoading: Promise<void> | null = null;

  private loadScript(): Promise<void> {
    if (this.scriptLoaded) return Promise.resolve();
    if (this.scriptLoading) return this.scriptLoading;

    this.scriptLoading = new Promise<void>((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps?.places) {
        this.scriptLoaded = true;
        this.initServices();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        this.initServices();
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });

    return this.scriptLoading;
  }

  private initServices(): void {
    this.autocompleteService = new google.maps.places.AutocompleteService();
    // PlacesService needs a DOM element, create a hidden one
    const div = document.createElement('div');
    this.placesService = new google.maps.places.PlacesService(div);
  }

  searchPlaces(query: string): Observable<PlacePrediction[]> {
    if (!query || query.length < 3) return of([]);

    return from(
      this.loadScript().then(
        () =>
          new Promise<PlacePrediction[]>((resolve) => {
            this.autocompleteService!.getPlacePredictions(
              {
                input: query,
                types: ['establishment', 'geocode'],
              },
              (predictions, status) => {
                this.ngZone.run(() => {
                  if (
                    status === google.maps.places.PlacesServiceStatus.OK &&
                    predictions
                  ) {
                    resolve(
                      predictions.map((p) => ({
                        place_id: p.place_id,
                        description: p.description,
                      }))
                    );
                  } else {
                    resolve([]);
                  }
                });
              }
            );
          })
      )
    );
  }

  getPlaceDetails(placeId: string): Observable<PlaceResult | null> {
    return from(
      this.loadScript().then(
        () =>
          new Promise<PlaceResult | null>((resolve) => {
            this.placesService!.getDetails(
              {
                placeId,
                fields: ['geometry', 'formatted_address', 'place_id', 'url'],
              },
              (place, status) => {
                this.ngZone.run(() => {
                  if (
                    status === google.maps.places.PlacesServiceStatus.OK &&
                    place?.geometry?.location
                  ) {
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    resolve({
                      place_id: place.place_id || placeId,
                      display_name: place.formatted_address || '',
                      lat,
                      lng,
                      google_maps_link:
                        place.url ||
                        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                    });
                  } else {
                    resolve(null);
                  }
                });
              }
            );
          })
      )
    );
  }
}

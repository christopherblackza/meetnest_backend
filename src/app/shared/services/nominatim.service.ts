import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
  type?: string;
  class?: string;
}

export interface ReverseGeocodeResult {
  display_name: string;
  address: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class NominatimService {
  private readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  private http = inject(HttpClient);

  search(
    query: string,
    options?: { countryCode?: string; limit?: number }
  ): Observable<NominatimResult[]> {
    if (!query || query.length < 3) {
      return of([]);
    }

    let params = new HttpParams()
      .set('format', 'json')
      .set('q', query)
      .set('addressdetails', '1')
      .set('limit', String(options?.limit ?? 8));

    if (options?.countryCode) {
      params = params.set('countrycodes', options.countryCode);
    }

    return this.http
      .get<NominatimResult[]>(`${this.BASE_URL}/search`, { params })
      .pipe(
        catchError((error) => {
          console.error('Nominatim search error:', error);
          return of([]);
        })
      );
  }

  reverseGeocode(
    lat: number,
    lng: number
  ): Observable<ReverseGeocodeResult | null> {
    const params = new HttpParams()
      .set('format', 'json')
      .set('lat', String(lat))
      .set('lon', String(lng));

    return this.http
      .get<any>(`${this.BASE_URL}/reverse`, { params })
      .pipe(
        map((data) => ({
          display_name: data.display_name,
          address: data.address,
        })),
        catchError((error) => {
          console.error('Nominatim reverse geocode error:', error);
          return of(null);
        })
      );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ClientService } from './client.service.base';
import { Client } from '../../../core/models/client.model';
import { environment } from '../../../../environments/environment';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class NestClientService extends ClientService {
  constructor(
    private http: HttpClient,
    private supabase: SupabaseService
  ) {
    super();
  }

  private getAuthHeaders(): Observable<Record<string, string>> {
    return from(this.supabase.client.auth.getSession()).pipe(
      map(({ data: { session } }) => {
        const token = session?.access_token;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
      })
    );
  }

  getClients(): Observable<Client[]> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get<Client[]>(`${environment.nestApiUrl}/clients`, { headers }))
    );
  }

  getClientById(id: string): Observable<Client> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.get<Client>(`${environment.nestApiUrl}/clients/${id}`, { headers }))
    );
  }

  createClient(client: Omit<Client, 'id' | 'created_at'>): Observable<Client> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post<Client>(`${environment.nestApiUrl}/clients`, client, { headers }))
    );
  }

  updateClient(id: string, client: Partial<Client>): Observable<Client> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.patch<Client>(`${environment.nestApiUrl}/clients/${id}`, client, { headers }))
    );
  }

  deleteClient(id: string): Observable<void> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.delete<void>(`${environment.nestApiUrl}/clients/${id}`, { headers }))
    );
  }

  uploadClientImages(clientId: string, files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post<string[]>(`${environment.nestApiUrl}/clients/${clientId}/images`, formData, { headers }))
    );
  }

  uploadClientLogo(clientId: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.post(`${environment.nestApiUrl}/clients/${clientId}/logo`, formData, {
        headers,
        responseType: 'text'
      }))
    );
  }

  removeClientImage(clientId: string, imageUrl: string): Observable<void> {
    return this.getAuthHeaders().pipe(
      switchMap(headers => this.http.delete<void>(`${environment.nestApiUrl}/clients/${clientId}/images`, {
        body: { imageUrl },
        headers
      }))
    );
  }
}

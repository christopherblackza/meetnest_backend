import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { ClientService } from './client.service.base';
import { Client } from '../../../core/models/client.model';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseClientService extends ClientService {
  constructor(private supabase: SupabaseService) {
    super();
  }

  getClients(): Observable<Client[]> {
    return from(this.supabase.client.from('clients').select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Client[];
      })
    );
  }

  getClientById(id: string): Observable<Client> {
    return from(this.supabase.client.from('clients').select('*').eq('id', id).single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Client;
      })
    );
  }

  createClient(client: Omit<Client, 'id' | 'created_at'>): Observable<Client> {
    return from(this.supabase.client.from('clients').insert(client).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Client;
      })
    );
  }

  updateClient(id: string, client: Partial<Client>): Observable<Client> {
    return from(this.supabase.client.from('clients').update(client).eq('id', id).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Client;
      })
    );
  }

  deleteClient(id: string): Observable<void> {
    return from(this.supabase.client.from('clients').delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  uploadClientImages(clientId: string, files: File[]): Observable<string[]> {
    // This requires uploading to Supabase Storage
    // Assuming bucket name 'client-images'
    const uploadPromises = files.map(async (file) => {
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { data, error } = await this.supabase.client.storage
        .from('client-images')
        .upload(path, file);
      
      if (error) throw error;
      
      const { data: publicUrlData } = this.supabase.client.storage
        .from('client-images')
        .getPublicUrl(path);
        
      return publicUrlData.publicUrl;
    });

    return from(Promise.all(uploadPromises));
  }

  uploadClientLogo(clientId: string, file: File): Observable<string> {
    return from((async () => {
      const path = `${clientId}/logo-${Date.now()}-${file.name}`;
      const { data, error } = await this.supabase.client.storage
        .from('client-images')
        .upload(path, file, { upsert: true });
        
      if (error) throw error;

      const { data: publicUrlData } = this.supabase.client.storage
        .from('client-images')
        .getPublicUrl(path);

      return publicUrlData.publicUrl;
    })());
  }

  removeClientImage(clientId: string, imageUrl: string): Observable<void> {
    // Extract path from URL assuming standard Supabase storage URL format
    // .../storage/v1/object/public/client-images/path/to/file
    try {
      const url = new URL(imageUrl);
      const parts = url.pathname.split('/client-images/');
      if (parts.length < 2) {
        throw new Error('Invalid image URL format');
      }
      const path = parts[1]; // Everything after /client-images/
      
      return from(this.supabase.client.storage.from('client-images').remove([path])).pipe(
        map(({ error }) => {
          if (error) throw error;
        })
      );
    } catch (err) {
      return new Observable(observer => observer.error(err));
    }
  }
}

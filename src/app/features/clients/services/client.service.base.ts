import { Observable } from 'rxjs';
import { Client } from '../../../core/models/client.model';

export abstract class ClientService {
  abstract getClients(): Observable<Client[]>;
  abstract getClientById(id: string): Observable<Client>;
  abstract createClient(client: Omit<Client, 'id' | 'created_at'>): Observable<Client>;
  abstract updateClient(id: string, client: Partial<Client>): Observable<Client>;
  abstract deleteClient(id: string): Observable<void>;
  abstract uploadClientImages(clientId: string, files: File[]): Observable<string[]>;
  abstract uploadClientLogo(clientId: string, file: File): Observable<string>;
  abstract removeClientImage(clientId: string, imageUrl: string): Observable<void>;
}

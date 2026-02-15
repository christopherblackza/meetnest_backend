export type ClientType = | 'bar' | 'restaurant' | 'cafe' | 'gym' | 'market' | 'volunteering' | 'social';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  description: string;
  latitude: number;
  longitude: number;
  phone: string;
  address: string;
  website_url?: string;
  instagram_url?: string;
  google_maps_link?: string;
  contact_number?: string;
  email?: string;
  rating?: number;
  image_url?: string[];
  logo_url?: string;
  created_at: string;
}
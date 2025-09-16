export interface City {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface FutureTrip {
  id: string;
  user_id: string;
  city_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user_profile?: any;
  city?: City;
}

export interface Meetup {
  id: string;
  organizer_id: string;
  city_id: string;
  title: string;
  description?: string;
  location?: string;
  date_time: string;
  max_participants?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  organizer?: any;
  city?: City;
  participants_count?: number;
}

export interface Event {
  id: string;
  organizer_id: string;
  city_id: string;
  title: string;
  description?: string;
  location?: string;
  date_time: string;
  max_attendees?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  organizer?: any;
  city?: City;
  attendees_count?: number;
}

export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  participants_count?: number;
  last_message?: any;
  unread_count?: number;
}

export interface TravelSocialStats {
  total_cities: number;
  total_trips: number;
  total_meetups: number;
  total_events: number;
  total_chats: number;
  active_meetups: number;
  active_events: number;
  upcoming_events: number;
  popular_cities: City[];
}

export interface TravelSocialFilters {
  search?: string;
  city_id?: string;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
  organizer_id?: string;
}
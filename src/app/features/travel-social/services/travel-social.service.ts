import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  City,
  FutureTrip,
  Meetup,
  Event,
  Chat,
  TravelSocialStats,
  TravelSocialFilters
} from '../models/travel-social.models';

@Injectable({
  providedIn: 'root'
})
export class TravelSocialService {
  constructor(private supabase: SupabaseService) {}

  // Cities Management
  getCities(filters?: TravelSocialFilters): Observable<City[]> {
    return from(this.fetchCities(filters));
  }

  private async fetchCities(filters?: TravelSocialFilters): Promise<City[]> {
    let query = this.supabase.client
      .from('cities')
      .select('*')
      .order('name');

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,country.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  createCity(city: Partial<City>): Observable<City> {
    return from(this.insertCity(city));
  }

  private async insertCity(city: Partial<City>): Promise<City> {
    const { data, error } = await this.supabase.client
      .from('cities')
      .insert([city])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  updateCity(id: string, updates: Partial<City>): Observable<City> {
    return from(this.modifyCity(id, updates));
  }

  private async modifyCity(id: string, updates: Partial<City>): Promise<City> {
    const { data, error } = await this.supabase.client
      .from('cities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Future Trips Management
  getFutureTrips(filters?: TravelSocialFilters): Observable<FutureTrip[]> {
    return from(this.fetchFutureTrips(filters));
  }

  private async fetchFutureTrips(filters?: TravelSocialFilters): Promise<FutureTrip[]> {
    let query = this.supabase.client
      .from('future_trips')
      .select(`
        *,
        user_profile:user_profiles(display_name, avatar_url),
        city:cities(name, country)
      `)
      .order('start_date', { ascending: false });

    if (filters?.city_id) {
      query = query.eq('city_id', filters.city_id);
    }

    if (filters?.date_from) {
      query = query.gte('start_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('end_date', filters.date_to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Meetups Management
  getMeetups(filters?: TravelSocialFilters): Observable<Meetup[]> {
    return from(this.fetchMeetups(filters));
  }

  private async fetchMeetups(filters?: TravelSocialFilters): Promise<Meetup[]> {
    let query = this.supabase.client
      .from('meetups')
      .select(`
        *,
        organizer:user_profiles(display_name, avatar_url),
        city:cities(name, country)
      `)
      .order('date_time', { ascending: false });

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.city_id) {
      query = query.eq('city_id', filters.city_id);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  updateMeetupStatus(id: string, is_active: boolean): Observable<Meetup> {
    return from(this.modifyMeetupStatus(id, is_active));
  }

  private async modifyMeetupStatus(id: string, is_active: boolean): Promise<Meetup> {
    const { data, error } = await this.supabase.client
      .from('meetups')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Events Management
  getEvents(filters?: TravelSocialFilters): Observable<Event[]> {
    return from(this.fetchEvents(filters));
  }

  private async fetchEvents(filters?: TravelSocialFilters): Promise<Event[]> {
    let query = this.supabase.client
      .from('events')
      .select(`
        *,
        organizer:user_profiles(display_name, avatar_url),
        city:cities(name, country)
      `)
      .order('date_time', { ascending: false });

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.city_id) {
      query = query.eq('city_id', filters.city_id);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  updateEventStatus(id: string, is_active: boolean): Observable<Event> {
    return from(this.modifyEventStatus(id, is_active));
  }

  private async modifyEventStatus(id: string, is_active: boolean): Promise<Event> {
    const { data, error } = await this.supabase.client
      .from('events')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Chats Management
  getChats(filters?: TravelSocialFilters): Observable<Chat[]> {
    return from(this.fetchChats(filters));
  }

  private async fetchChats(filters?: TravelSocialFilters): Promise<Chat[]> {
    let query = this.supabase.client
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Statistics
  getTravelSocialStats(): Observable<TravelSocialStats> {
    return from(this.fetchTravelSocialStats());
  }

  private async fetchTravelSocialStats(): Promise<TravelSocialStats> {
    const [cities, trips, meetups, events, chats] = await Promise.all([
      this.supabase.client.from('cities').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('future_trips').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('meetups').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('events').select('*', { count: 'exact', head: true }),
      this.supabase.client.from('chats').select('*', { count: 'exact', head: true })
    ]);

    const [activeMeetups, activeEvents, upcomingEvents] = await Promise.all([
      this.supabase.client.from('meetups').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.client.from('events').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.client.from('events').select('*', { count: 'exact', head: true }).gte('date_time', new Date().toISOString())
    ]);

    // Get popular cities (cities with most trips) - Fixed query
    const { data: popularCitiesData } = await this.supabase.client
      .from('cities')
      .select(`
        id,
        name,
        country,
        latitude,
        longitude,
        timezone,
        created_at,
        updated_at,
        future_trips!inner(count)
      `)
      .order('future_trips.count', { ascending: false })
      .limit(5);

    return {
      total_cities: cities.count || 0,
      total_trips: trips.count || 0,
      total_meetups: meetups.count || 0,
      total_events: events.count || 0,
      total_chats: chats.count || 0,
      active_meetups: activeMeetups.count || 0,
      active_events: activeEvents.count || 0,
      upcoming_events: upcomingEvents.count || 0,
      popular_cities: popularCitiesData || []
    };
  }
}
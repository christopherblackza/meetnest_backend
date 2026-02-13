import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, from, firstValueFrom } from 'rxjs';
import { Client } from '../models/client.model';

// Data Types from Technical Architecture
export interface UserProfile {
  user_id: string;
  display_name: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned';
  trust_score: number;
  created_at: string;
  current_city?: string;
  current_country?: string;
}

export interface AnalyticsOverview {
  total_users: number;
  active_users: number;
  total_reports: number;
  total_subscriptions: number;
  growth_rate: number;
  churn_rate: number;
  new_users_7d: number;
  new_users_30d: number;
  active_paid_users: number;
  churned_subscriptions: number;
  meetups_created: number;
  events_created: number;
  total_attendees: number;
  reports_opened: number;
  reports_resolved: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  created_by: string;
  start_date_time: string;
  end_date_time: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  is_public: boolean;
  attendee_count: number;
  chat_id?: string;
}

export interface Meetup {
  id: string;
  title: string;
  description: string;
  created_by: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  emoticon?: string;
  female_only: boolean;
  expires_at: string;
  participant_count: number;
  chat_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'action_taken';
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  interval: 'week' | 'month' | '3_months';
  price_cents: number;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'non_renewing';
  start_date: string;
  cancel_at?: string;
  provider_subscription_id?: string;
}

export interface ModerationAction {
  id: string;
  user_id: string;
  admin_id: string;
  action_type: string;
  reason: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: UserProfile;
}

export interface UserPreferences {
  user_id: string;
  languages?: string[];
  interests?: string[];
  relationship_status?: string;
  notifications_enabled: boolean;
  location_sharing: boolean;
}

export interface DataGridOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  search?: string;
}

export interface DataGridResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private sessionLoadedSubject = new BehaviorSubject<boolean>(false);
  public sessionLoaded$ = this.sessionLoadedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
    );

    // Check for existing session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUserSubject.next(session?.user ?? null);
      this.sessionLoadedSubject.next(true);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  get client() {
    return this.supabase;
  }

  get user() {
    return this.currentUserSubject.value;
  }

  // Authentication Methods
  async signIn(email: string, password: string) {
    try {
      const data = await firstValueFrom(
        this.http.post<any>(`${environment.nestApiUrl}/auth/signin`, {
          email,
          password,
        }),
      );

      if (data.session) {
        const { error } = await this.supabase.auth.setSession(data.session);
        if (error) throw error;
      }

      return { data, error: null };
    } catch (err: any) {
      // Handle HTTP errors or other errors
      const errorMessage =
        err.error?.message || err.message || 'An error occurred during sign in';
      return { data: null, error: { message: errorMessage } };
    }
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  async resetPassword(email: string) {
    const { data, error } =
      await this.supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  }

  // Analytics RPCs
  async getAnalyticsOverview(
    dateRange: 'week' | 'month',
    startDate?: string,
    endDate?: string,
  ): Promise<AnalyticsOverview> {
    const { data, error } = await this.supabase.rpc('get_analytics_overview', {
      date_range: dateRange,
      start_date: startDate,
      end_date: endDate,
    });

    if (error) throw error;
    return data;
  }

  async exportAnalyticsData(
    exportFormat: 'json' | 'csv',
    dataType: 'overview' | 'users' | 'revenue',
  ) {
    const { data, error } = await this.supabase.rpc('export_analytics_data', {
      export_format: exportFormat,
      data_type: dataType,
    });

    if (error) throw error;
    return data;
  }

  // User Management RPCs
  async getUserProfile(uid: string, adminUid: string): Promise<UserProfile> {
    const { data, error } = await this.supabase.rpc('get_user_profile', {
      uid,
      current_user_id: adminUid,
    });

    if (error) throw error;
    return data[0];
  }

  async getUserRole(
    userId: string,
  ): Promise<{ user_id: string; role: string }> {
    return firstValueFrom(
      this.http.get<{ user_id: string; role: string }>(
        `${environment.nestApiUrl}/users/${userId}/role`,
      ),
    );
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ) {
    const { data, error } = await this.supabase.rpc('update_user_preferences', {
      user_id: userId,
      preferences,
    });

    if (error) throw error;
    return data;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.supabase.rpc('get_user_preferences', {
      user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  async calculateUserTrustScore(
    userId: string,
  ): Promise<{ old_score: number; new_score: number }> {
    const { data, error } = await this.supabase.rpc(
      'calculate_user_trust_score',
      {
        user_id: userId,
      },
    );

    if (error) throw error;
    return data;
  }

  // Event Management RPCs
  async createEvent(eventData: {
    title: string;
    description: string;
    start_date_time: string;
    end_date_time: string;
    latitude: number;
    longitude: number;
    max_participants: number;
    is_public: boolean;
  }): Promise<Event> {
    const { data, error } = await this.supabase.rpc('create_event', eventData);

    if (error) throw error;
    return data;
  }

  async getEventDetails(
    eventId: string,
    adminUserId: string,
  ): Promise<Event & { attendees: UserProfile[] }> {
    const { data, error } = await this.supabase.rpc('get_event_details', {
      event_id: eventId,
      admin_user_id: adminUserId,
    });

    if (error) throw error;
    return data;
  }

  async getEventsInBounds(
    adminUid: string,
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
  ): Promise<Event[]> {
    const { data, error } = await this.supabase.rpc('get_events_in_bounds', {
      admin_uid: adminUid,
      min_lat: minLat,
      max_lat: maxLat,
      min_lng: minLng,
      max_lng: maxLng,
    });

    if (error) throw error;
    return data;
  }

  // Meetup Management RPCs
  async createMeetup(meetupData: {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    max_participants: number;
    emoticon?: string;
    female_only: boolean;
    expires_at: string;
  }): Promise<Meetup> {
    const { data, error } = await this.supabase.rpc(
      'create_meetup',
      meetupData,
    );

    if (error) throw error;
    return data;
  }

  async getUserActiveMeetups(userId: string): Promise<Meetup[]> {
    const { data, error } = await this.supabase.rpc('get_user_active_meetups', {
      user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  async getUserPastMeetups(userId: string): Promise<Meetup[]> {
    const { data, error } = await this.supabase.rpc('get_user_past_meetups', {
      user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  async getMeetupsInBounds(
    adminUid: string,
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
  ): Promise<Meetup[]> {
    const { data, error } = await this.supabase.rpc('get_meetups_in_bounds', {
      admin_uid: adminUid,
      min_lat: minLat,
      max_lat: maxLat,
      min_lng: minLng,
      max_lng: maxLng,
    });

    if (error) throw error;
    return data;
  }

  // Subscription Management RPCs
  async upgradeToProPlan(userId: string, planId: string) {
    const { data, error } = await this.supabase.rpc('upgrade_to_pro_plan', {
      user_id: userId,
      plan_id: planId,
    });

    if (error) throw error;
    return data;
  }

  async downgradeToFreePlan(userId: string) {
    const { data, error } = await this.supabase.rpc('downgrade_to_free_plan', {
      user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  async recordSubscriptionPayment(
    subscriptionId: string,
    amountCents: number,
    currency: string,
    providerPaymentId: string,
  ) {
    const { data, error } = await this.supabase.rpc(
      'record_subscription_payment',
      {
        subscription_id: subscriptionId,
        amount_cents: amountCents,
        currency,
        provider_payment_id: providerPaymentId,
      },
    );

    if (error) throw error;
    return data;
  }

  async redeemPromoCode(code: string, userId: string) {
    const { data, error } = await this.supabase.rpc('redeem_promo_code', {
      code,
      user_id: userId,
    });

    if (error) throw error;
    return data;
  }

  // Moderation RPCs
  async getChatScreen(
    chatId: string,
    adminUserId: string,
  ): Promise<{ chat: any; messages: ChatMessage[] }> {
    const { data, error } = await this.supabase.rpc('get_chat_screen', {
      chat_id: chatId,
      admin_user_id: adminUserId,
    });

    if (error) throw error;
    return data;
  }

  async createModerationAction(
    userId: string,
    actionType: 'warning' | 'suspension' | 'ban',
    reason: string,
    adminId: string,
  ): Promise<ModerationAction> {
    const { data, error } = await this.supabase.rpc(
      'create_moderation_action',
      {
        user_id: userId,
        action_type: actionType,
        reason,
        admin_id: adminId,
      },
    );

    if (error) throw error;
    return data;
  }

  async getCurrentUserId(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getUser();

    if (error) throw error;
    return data?.user?.id || null;
  }

  // Enhanced Data Grid Methods with server-side pagination, filtering, and sorting
  async getUserProfilesGrid(
    options: DataGridOptions,
  ): Promise<DataGridResult<UserProfile>> {
    let query = this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact' });

    // Apply search
    if (options.search) {
      query = query.or(
        `display_name.ilike.%${options.search}%,email.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['role']) {
      query = query.eq('role', options.filters['role']);
    }
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }
    if (options.filters?.['minTrustScore'] !== undefined) {
      query = query.gte('trust_score', options.filters['minTrustScore']);
    }
    if (options.filters?.['maxTrustScore'] !== undefined) {
      query = query.lte('trust_score', options.filters['maxTrustScore']);
    }
    if (options.filters?.['dateFrom']) {
      query = query.gte('created_at', options.filters['dateFrom']);
    }
    if (options.filters?.['dateTo']) {
      query = query.lte('created_at', options.filters['dateTo']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  // Client Management Methods
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getClients(): Promise<any[]> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http.get<any[]>(`${environment.nestApiUrl}/clients`, { headers }),
    );
  }

  async getClientById(id: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http.get<any>(`${environment.nestApiUrl}/clients/${id}`, {
        headers,
      }),
    );
  }

  async createClient(client: Omit<Client, 'id' | 'created_at'>): Promise<any> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http.post<any>(`${environment.nestApiUrl}/clients`, client, {
        headers,
      }),
    );
  }

  async updateClient(id: string, client: Partial<Client>): Promise<any> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http.patch<any>(`${environment.nestApiUrl}/clients/${id}`, client, {
        headers,
      }),
    );
  }

  async deleteClient(id: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http.delete<any>(`${environment.nestApiUrl}/clients/${id}`, {
        headers,
      }),
    );
  }

  async uploadClientImages(clientId: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const headers = await this.getAuthHeaders();

    return firstValueFrom(
      this.http.post<string[]>(
        `${environment.nestApiUrl}/clients/${clientId}/images`,
        formData,
        { headers },
      ),
    );
  }

  async uploadClientLogo(clientId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = await this.getAuthHeaders();

    return firstValueFrom(
      this.http.post(
        `${environment.nestApiUrl}/clients/${clientId}/logo`,
        formData,
        {
          headers,
          responseType: 'text' as const,
        },
      ),
    );
  }

  async removeClientImage(clientId: string, imageUrl: string): Promise<void> {
    const headers = await this.getAuthHeaders();

    return firstValueFrom(
      this.http.delete<void>(
        `${environment.nestApiUrl}/clients/${clientId}/images`,
        {
          body: { imageUrl },
          headers,
        },
      ),
    );
  }

  async getEventsGrid(
    options: DataGridOptions,
  ): Promise<
    DataGridResult<Event & { creator: UserProfile; attendee_count: number }>
  > {
    let query = this.supabase.from('events').select(
      `
        *,
        creator:user_profiles!events_created_by_fkey(user_id, display_name, email),
        attendee_count:event_attendees(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `title.ilike.%${options.search}%,description.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }
    if (options.filters?.['isPublic'] !== undefined) {
      query = query.eq('is_public', options.filters['isPublic']);
    }
    if (options.filters?.['dateFrom']) {
      query = query.gte('start_date_time', options.filters['dateFrom']);
    }
    if (options.filters?.['dateTo']) {
      query = query.lte('start_date_time', options.filters['dateTo']);
    }
    if (options.filters?.['minParticipants'] !== undefined) {
      query = query.gte('max_participants', options.filters['minParticipants']);
    }
    if (options.filters?.['maxParticipants'] !== undefined) {
      query = query.lte('max_participants', options.filters['maxParticipants']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'start_date_time';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  async getMeetupsGrid(
    options: DataGridOptions,
  ): Promise<
    DataGridResult<Meetup & { creator: UserProfile; participant_count: number }>
  > {
    let query = this.supabase.from('meetups').select(
      `
        *,
        creator:user_profiles!meetups_created_by_fkey(user_id, display_name, email),
        participant_count:participants(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `title.ilike.%${options.search}%,description.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }
    if (options.filters?.['femaleOnly'] !== undefined) {
      query = query.eq('female_only', options.filters['femaleOnly']);
    }
    if (options.filters?.['dateFrom']) {
      query = query.gte('expires_at', options.filters['dateFrom']);
    }
    if (options.filters?.['dateTo']) {
      query = query.lte('expires_at', options.filters['dateTo']);
    }
    if (options.filters?.['minParticipants'] !== undefined) {
      query = query.gte('max_participants', options.filters['minParticipants']);
    }
    if (options.filters?.['maxParticipants'] !== undefined) {
      query = query.lte('max_participants', options.filters['maxParticipants']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  async getChatMessagesGrid(
    options: DataGridOptions,
  ): Promise<
    DataGridResult<
      ChatMessage & {
        sender_profile: UserProfile;
        chat_info: any;
        reports_count: number;
      }
    >
  > {
    let query = this.supabase.from('chat_messages').select(
      `
        *,
        sender_profile:user_profiles!chat_messages_sender_id_fkey(user_id, display_name, email),
        chat_info:chats!chat_messages_chat_id_fkey(id, type, name),
        reports_count:message_reports(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.ilike('content', `%${options.search}%`);
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }
    if (options.filters?.['messageType']) {
      query = query.eq('message_type', options.filters['messageType']);
    }
    if (options.filters?.['chatType']) {
      query = query.eq('chat_info.type', options.filters['chatType']);
    }
    if (options.filters?.['dateFrom']) {
      query = query.gte('created_at', options.filters['dateFrom']);
    }
    if (options.filters?.['dateTo']) {
      query = query.lte('created_at', options.filters['dateTo']);
    }
    if (options.filters?.['hasReports'] !== undefined) {
      if (options.filters['hasReports']) {
        query = query.gt('reports_count', 0);
      } else {
        query = query.eq('reports_count', 0);
      }
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  async getUserReportsGrid(
    options: DataGridOptions,
  ): Promise<
    DataGridResult<
      UserReport & { reporter: UserProfile; reported_user: UserProfile }
    >
  > {
    const { data, error } = await this.supabase.rpc('get_user_reports_grid', {
      page_num: options.page,
      page_size: options.pageSize,
      sort_by: options.sortBy || 'created_at',
      sort_order: options.sortOrder || 'desc',
      search_text: options.search || null,
      filter_status: options.filters?.['status'] || null,
      filter_reason: options.filters?.['reason'] || null,
      filter_date_from: options.filters?.['dateFrom'] || null,
      filter_date_to: options.filters?.['dateTo'] || null,
    });

    if (error) throw error;

    // Extract the total count from the first row (if available)
    const totalCount = data && data.length > 0 ? data[0].total_count : 0;

    // Filter out the total count row if it exists
    const reportData = data ? data.filter((row: any) => row.id !== null) : [];

    return {
      data: reportData,
      count: totalCount,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(totalCount / options.pageSize),
    };
  }

  async getSubscriptionsGrid(
    options: DataGridOptions,
  ): Promise<
    DataGridResult<Subscription & { plan: SubscriptionPlan; user: UserProfile }>
  > {
    let query = this.supabase.from('subscriptions').select(
      `
        *,
        plan:plans(*),
        user:user_profiles(user_id, display_name, email)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `user.display_name.ilike.%${options.search}%,user.email.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }
    if (options.filters?.['planId']) {
      query = query.eq('plan_id', options.filters['planId']);
    }
    if (options.filters?.['dateFrom']) {
      query = query.gte('start_date', options.filters['dateFrom']);
    }
    if (options.filters?.['dateTo']) {
      query = query.lte('start_date', options.filters['dateTo']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'start_date';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  // Catalog Management Grid Methods
  async getInterestsGrid(
    options: DataGridOptions,
  ): Promise<DataGridResult<any>> {
    let query = this.supabase.from('interests').select(
      `
        *,
        usage_count:user_interests(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `name.ilike.%${options.search}%,description.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['category']) {
      query = query.eq('category', options.filters['category']);
    }
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  async getLanguagesGrid(
    options: DataGridOptions,
  ): Promise<DataGridResult<any>> {
    let query = this.supabase.from('languages').select(
      `
        *,
        usage_count:user_languages(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `name.ilike.%${options.search}%,native_name.ilike.%${options.search}%,code.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  async getTaxonomiesGrid(
    options: DataGridOptions,
  ): Promise<DataGridResult<any>> {
    let query = this.supabase.from('taxonomies').select(
      `
        *,
        interests_count:interests(count)
      `,
      { count: 'exact' },
    );

    // Apply search
    if (options.search) {
      query = query.or(
        `name.ilike.%${options.search}%,description.ilike.%${options.search}%`,
      );
    }

    // Apply filters
    if (options.filters?.['status']) {
      query = query.eq('status', options.filters['status']);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'sort_order';
    const sortOrder = options.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const start = options.page * options.pageSize;
    const end = start + options.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil((count || 0) / options.pageSize),
    };
  }

  // CSV Export Methods
  async exportToCSV(
    tableName: string,
    options: DataGridOptions,
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('export_table_to_csv', {
      table_name: tableName,
      filters: options.filters || {},
      search_term: options.search || '',
      sort_by: options.sortBy || 'created_at',
      sort_order: options.sortOrder || 'desc',
    });

    if (error) throw error;
    return data;
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

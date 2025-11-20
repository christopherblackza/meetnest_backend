import { Injectable } from "@angular/core";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { environment } from "../../environments/environment";
import { BehaviorSubject, Observable } from "rxjs";
import { Client, Activity, UserProfile } from "./types";

class SimpleStorageAdapter implements Storage {
  private storage: Map<string, string> = new Map();
  private storageIndex = 0;

  get length(): number {
    return this.storage.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item !== null) {
          return item;
        }
      }
    } catch (e) {
      // Fall through to in-memory storage
    }
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Fall back to in-memory only
    }
  }

  removeItem(key: string): void {
    this.storage.delete(key);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Fall back to in-memory only
    }
  }

  clear(): void {
    this.storage.clear();
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.clear();
      }
    } catch (e) {
      // Fall back to in-memory only
    }
  }
}

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  constructor() {
    const storageAdapter = new SimpleStorageAdapter();
    try {
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
        {
          auth: {
            storage: storageAdapter as any,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: "implicit",
          },
        },
      );
    } catch (error) {
      console.error("Supabase initialization error:", error);
      this.supabase = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
      );
    }
    this.checkAuthStatus();
  }

  private async checkAuthStatus() {
    try {
      const { data } = await this.supabase.auth.getSession();
      this.currentUser.next(data?.session?.user || null);
    } catch (error) {
      console.error("Auth check error:", error);
    }
  }

  // Auth methods
  async signUp(email: string, password: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data?.user || null;
  }

  async signIn(email: string, password: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    this.currentUser.next(data?.user || null);
    return data?.user || null;
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.warn("Supabase signOut error:", error);
      }
    } catch (error) {
      console.warn("Supabase signOut exception:", error);
    }
    this.currentUser.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }

  // Client CRUD
  async getClients(): Promise<Client[]> {
    const { data, error } = await this.supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await this.supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async createClient(
    client: Omit<Client, "id" | "created_at">,
  ): Promise<Client> {
    if (!client.name || !client.type || !client.description) {
      throw new Error("Name, type, and description are required");
    }
    
    console.log('CLIENT PAYLOAD', client)
    const { error } = await this.supabase.from("clients").insert([client]);

    if (error) {
      throw new Error(
        "Failed to create client: " + (error.message || "Unknown error"),
      );
    }

    return client as any;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    console.log("UPDATE CLIENT", id, updates);

    const { error } = await this.supabase
      .from("clients")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw new Error(
        "Failed to update client: " + (error.message || "Unknown error"),
      );
    }

    return updates as any;
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await this.supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  }

  async bulkInsertClients(
    clients: Omit<Client, "id" | "created_at">[],
  ): Promise<Client[]> {
    const chunks = [];
    for (let i = 0; i < clients.length; i += 100) {
      chunks.push(clients.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const { error } = await this.supabase.from("clients").insert(chunk);
      if (error) {
        throw new Error(
          "Failed to insert clients: " + (error.message || "Unknown error"),
        );
      }
    }
    return clients as any;
  }

  // Activity CRUD
  async getActivities(): Promise<Activity[]> {
    const { data, error } = await this.supabase
      .from("activities")
      .select("*")
      .order("start_date_time", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getActivity(id: string): Promise<Activity | null> {
    const { data, error } = await this.supabase
      .from("activities")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  async createActivity(
    activity: Omit<Activity, "id" | "created_at">,
  ): Promise<Activity> {
    if (!activity.created_by) {
      throw new Error("created_by is required");
    }
    console.error('ACTIVITY PAYLOAD', activity)

    const { error } = await this.supabase.from("activities").insert([activity]);

    if (error) {
      throw new Error(
        "Failed to create activity: " + (error.message || "Unknown error"),
      );
    }

    return activity as any;
  }

  async updateActivity(
    id: string,
    updates: Partial<Activity>,
  ): Promise<Activity> {
    const { error } = await this.supabase
      .from("activities")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw new Error(
        "Failed to update activity: " + (error.message || "Unknown error"),
      );
    }

    return updates as any;
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("activities")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async bulkInsertActivities(
    activities: Omit<Activity, "id" | "created_at">[],
  ): Promise<Activity[]> {
    const chunks = [];
    for (let i = 0; i < activities.length; i += 100) {
      chunks.push(activities.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const { error } = await this.supabase.from("activities").insert(chunk);
      if (error) {
        throw new Error(
          "Failed to insert activities: " + (error.message || "Unknown error"),
        );
      }
    }
    return activities as any;
  }

  async deleteDummyData(): Promise<void> {
    // Delete activities created by dummy data (marked by specific pattern or all for demo)
    const { error: activitiesError } = await this.supabase
      .from("activities")
      .delete()
      .is("created_by", null);

    if (activitiesError) throw activitiesError;

    const { error: clientsError } = await this.supabase
      .from("clients")
      .delete()
      .like("name", "%Dummy%");

    if (clientsError) throw clientsError;
  }
}

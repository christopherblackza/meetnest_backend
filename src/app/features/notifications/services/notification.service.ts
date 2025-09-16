import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  Notification,
  NotificationTemplate,
  NotificationStats,
  NotificationFilters,
  BulkNotificationRequest
} from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private supabase: SupabaseService) {}

  getNotifications(filters: NotificationFilters): Observable<Notification[]> {
    return from(this.fetchNotifications(filters));
  }

  getNotificationById(id: string): Observable<Notification | null> {
    return from(this.fetchNotificationById(id));
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return from(this.createNotificationRecord(notification));
  }

  updateNotification(id: string, updates: Partial<Notification>): Observable<Notification> {
    return from(this.updateNotificationRecord(id, updates));
  }

  deleteNotification(id: string): Observable<boolean> {
    return from(this.deleteNotificationRecord(id));
  }

  sendBulkNotification(request: BulkNotificationRequest): Observable<boolean> {
    return from(this.processBulkNotification(request));
  }

  getNotificationTemplates(): Observable<NotificationTemplate[]> {
    return from(this.fetchNotificationTemplates());
  }

  createTemplate(template: Partial<NotificationTemplate>): Observable<NotificationTemplate> {
    return from(this.createNotificationTemplate(template));
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): Observable<NotificationTemplate> {
    return from(this.updateNotificationTemplate(id, updates));
  }

  deleteTemplate(id: string): Observable<boolean> {
    return from(this.deleteNotificationTemplate(id));
  }

  getNotificationStats(filters: NotificationFilters): Observable<NotificationStats> {
    return from(this.fetchNotificationStats(filters));
  }

  cancelScheduledNotification(id: string): Observable<boolean> {
    return from(this.cancelNotification(id));
  }

  private async fetchNotifications(filters: NotificationFilters): Promise<Notification[]> {
    let query = this.supabase.client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return data || [];
  }

  private async fetchNotificationById(id: string): Promise<Notification | null> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  private async createNotificationRecord(notification: Partial<Notification>): Promise<Notification> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .insert({
        ...notification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async updateNotificationRecord(id: string, updates: Partial<Notification>): Promise<Notification> {
    const { data, error } = await this.supabase.client
      .from('notifications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async deleteNotificationRecord(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  private async processBulkNotification(request: BulkNotificationRequest): Promise<boolean> {
    // Create notification record
    const notification = await this.createNotificationRecord({
      title: request.title,
      message: request.message,
      type: request.type,
      priority: request.priority,
      recipient_type: request.recipient_type,
      recipient_ids: request.recipient_ids,
      scheduled_at: request.scheduled_at,
      status: request.scheduled_at ? 'scheduled' : 'sending',
      metadata: request.metadata
    });

    // Here you would integrate with your notification service (Firebase, OneSignal, etc.)
    // For now, we'll simulate the process
    if (!request.scheduled_at) {
      // Send immediately
      await this.updateNotificationRecord(notification.id, { 
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    }

    return true;
  }

  private async fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
    const { data, error } = await this.supabase.client
      .from('notification_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async createNotificationTemplate(template: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const { data, error } = await this.supabase.client
      .from('notification_templates')
      .insert({
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const { data, error } = await this.supabase.client
      .from('notification_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async deleteNotificationTemplate(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('notification_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  private async fetchNotificationStats(filters: NotificationFilters): Promise<NotificationStats> {
    const [notificationsResult, recentResult] = await Promise.all([
      this.supabase.client
        .from('notifications')
        .select('status'),
      
      this.supabase.client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const notifications = notificationsResult.data || [];
    const totalSent = notifications.filter(n => ['sent', 'delivered'].includes(n.status)).length;
    const totalDelivered = notifications.filter(n => n.status === 'delivered').length;
    const totalFailed = notifications.filter(n => n.status === 'failed').length;
    const totalPending = notifications.filter(n => ['draft', 'scheduled', 'sending'].includes(n.status)).length;

    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      total_pending: totalPending,
      delivery_rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      open_rate: 68.5, // Mock data - would come from analytics
      click_rate: 12.3, // Mock data - would come from analytics
      recent_notifications: recentResult.data || []
    };
  }

  private async cancelNotification(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('notifications')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'scheduled');

    if (error) throw error;
    return true;
  }
}
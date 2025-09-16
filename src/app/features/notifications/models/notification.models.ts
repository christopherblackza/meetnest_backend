export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipient_type: RecipientType;
  recipient_ids?: string[];
  scheduled_at?: string;
  sent_at?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  metadata?: NotificationMetadata;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: NotificationType;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_pending: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  recent_notifications: Notification[];
}

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  date_range?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface BulkNotificationRequest {
  template_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipient_type: RecipientType;
  recipient_ids?: string[];
  scheduled_at?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationMetadata {
  action_url?: string;
  image_url?: string;
  deep_link?: string;
  custom_data?: Record<string, any>;
}

export type NotificationType = 
  | 'meetup'
  | 'event'
  | 'friend_request'
  | 'message'
  | 'system'
  | 'trip'
  | 'nearby_meetup'
  | 'welcome_to_chat'
  | 'meetup_heating_up';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'cancelled';

export type RecipientType = 'all_users' | 'specific_users' | 'user_segment' | 'admins';
export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
   reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
  // Joined data
  reporter?: {
    full_name: string;
    email: string;
  };
  reported_user?: {
    full_name: string;
    email: string;
    user_status: string;
  };
}

export interface ContentFlag {
  id: string;
  user_id: string;
  content_type: 'profile' | 'message' | 'photo' | 'event' | 'meetup';
  content_id: string;
  flag_type: 'inappropriate' | 'spam' | 'fake' | 'harassment' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    full_name: string;
    email: string;
  };
}

export interface ModerationAction {
  id: string;
  moderator_id: string;
  target_user_id: string;
  action_type: 'warning' | 'temporary_suspension' | 'permanent_ban' | 'content_removal' | 'profile_restriction';
  reason: string;
  duration_hours?: number;
  created_at: string;
  // Joined data
  moderator?: {
    full_name: string;
    email: string;
  };
  target_user?: {
    full_name: string;
    email: string;
  };
}

export interface ModerationStats {
  pending_reports: number;
  resolved_today: number;
  total_actions: number;
  reports_by_type: Record<string, number>;
}

export interface ModerationFilters {
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
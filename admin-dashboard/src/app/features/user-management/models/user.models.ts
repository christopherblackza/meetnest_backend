export interface UserProfile {
  user_id: string;
  display_name?: string;
  full_name?: string;
  email?: string;
  bio?: string;
  date_of_birth?: string;
  occupation?: string;
  country_of_origin?: string;
  current_city?: string;
  current_country?: string;
  avatar_url?: string;
  instagram_handle?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  gender?: string;
  available_until?: string;
  is_verified: boolean;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned' ;
  auth_provider: string;
  is_founder: boolean;
  is_bot: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  trust_score: number;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  created_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  reporter_profile?: UserProfile;
  reported_profile?: UserProfile;
}

export interface ModerationAction {
  id: string;
  moderator_id?: string;
  target_user_id?: string;
  action_type: 'content_removed' | 'user_suspended' | 'user_banned' | 'warning_issued' | 'fake_report_dismissed';
  details?: string;
  report_id?: string;
  created_at: string;
  moderator_profile?: UserProfile;
  target_profile?: UserProfile;
}

export interface UserStats {
  total_users: number;
  verified_users: number;
  suspended_users: number;
  banned_users: number;
  pending_verifications: number;
  reports_pending: number;
  trust_score_avg: number;
}
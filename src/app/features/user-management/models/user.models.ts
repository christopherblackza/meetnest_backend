export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  full_name: string;
  avatar_url?: string;
  status: 'active' | 'suspended' | 'banned';
  role: 'user' | 'moderator' | 'admin';
  is_verified: boolean;
  verification_status: 'verified' | 'pending' | 'rejected' | 'unverified';
  trust_score: number;
  created_at: string;
  updated_at: string;
  city?: string;
  country?: string;
  last_login?: string;
  bio?: string;
  date_of_birth?: string;
  country_of_origin?: string;
  current_city?: string;
  current_country?: string;
  mobile_number?: string;
  instagram_handle?: string;
  linkedin_handle?: string;
  gender?: string;
  auth_provider?: string;
  verification_photo_url?: string;
  last_active_at?: string;
  latitude?: number;
  longitude?: number;
  referral_source?: string;
}



export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  avgTrustScore: number;
  userGrowth: number;
  activeGrowth: number;
  verificationGrowth: number;
  trustScoreChange: number;
}

export interface DataGridOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: {
    role?: string;
    status?: string;
    gender?: string;
    referralSource?: string;
    verified?: boolean;
    trustScoreMin?: number;
    trustScoreMax?: number;
    dateFrom?: string;
    dateTo?: string;
  };
}

export interface DataGridResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FounderMessageDto {
  my_message: string;
  title?: string;
  topic?: string;
  avatar_url?: string;
}

export interface FounderMessageUserDto {
  user_id: string;
  my_message: string;
  title?: string;
  avatar_url?: string;
}

export interface FounderMessageResponse {
  success: boolean;
  message: string;
  messageId?: string;
  topic?: string;
  error?: string;
}
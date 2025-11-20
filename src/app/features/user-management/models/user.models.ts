export interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  full_name: string; // Added for template compatibility
  avatar_url?: string;
  status: 'active' | 'suspended' | 'banned';
  role: 'user' | 'moderator' | 'admin';
  is_verified: boolean;
  verification_status: 'verified' | 'pending' | 'rejected' | 'unverified';
  trust_score: number;
  created_at: string;
  updated_at: string;
  // Optional properties used in template
  city?: string;
  country?: string;
  last_login?: string;
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
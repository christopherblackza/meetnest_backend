import { Observable } from 'rxjs';
import { 
  DataGridOptions, 
  DataGridResult, 
  UserProfile, 
  UserStats, 
  FounderMessageDto, 
  FounderMessageResponse 
} from '../models/user.models';

export abstract class UserManagementService {
  abstract getUsers(options: DataGridOptions): Observable<DataGridResult<UserProfile>>;
  abstract getUserStats(): Observable<UserStats>;
  abstract getUserById(userId: string): Observable<UserProfile>;
  abstract updateUserStatus(userId: string, status: 'active' | 'suspended' | 'banned'): Observable<boolean>;
  abstract updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Observable<boolean>;
  abstract updateVerificationStatus(userId: string, status: 'verified' | 'rejected' | 'pending'): Observable<boolean>;
  abstract recalculateTrustScore(userId: string): Observable<number>;
  abstract sendFounderMessage(data: FounderMessageDto): Observable<FounderMessageResponse>;
  abstract exportUsers(filters?: any): Observable<Blob>;
}

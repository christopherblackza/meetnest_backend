import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { SupabaseService } from '../supabase/supabase.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';
import { User } from './entities/user.entity';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateVerificationStatusDto } from './dto/update-verification-status.dto';
import { UserStatsDto } from './dto/user-stats.dto';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUsers(query: GetUsersQueryDto): Promise<UsersListResponseDto> {
    try {
      this.logger.log('Fetching users list', { query });

      const {
        limit = 20,
        offset = 0,
        search_term,
        current_city,
        current_country,
        country_of_origin,
        gender,
        min_age,
        max_age,
        exclude_user_id,
        status,
        role,
        verified,
        trustScoreMin,
        trustScoreMax,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder = 'desc',
      } = query;

      const queryBuilder = this.userRepository.createQueryBuilder('user');

      // Apply filters
      if (search_term) {
        queryBuilder.andWhere(
          '(user.display_name ILIKE :search OR user.full_name ILIKE :search OR user.bio ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search_term}%` },
        );
      }

      if (current_city) {
        queryBuilder.andWhere('user.current_city ILIKE :current_city', {
          current_city: `%${current_city}%`,
        });
      }

      if (current_country) {
        queryBuilder.andWhere('user.current_country ILIKE :current_country', {
          current_country: `%${current_country}%`,
        });
      }

      if (country_of_origin) {
        queryBuilder.andWhere(
          'user.country_of_origin ILIKE :country_of_origin',
          {
            country_of_origin: `%${country_of_origin}%`,
          },
        );
      }

      if (gender) {
        queryBuilder.andWhere('user.gender = :gender', { gender });
      }

      if (exclude_user_id) {
        queryBuilder.andWhere('user.user_id != :exclude_user_id', {
          exclude_user_id,
        });
      }

      if (status) {
        queryBuilder.andWhere('user.status = :status', { status });
      }

      if (role) {
        queryBuilder.andWhere('user.role = :role', { role });
      }

      if (verified !== undefined) {
        // Handle both boolean and string inputs
        const isVerified = String(verified) === 'true';
        queryBuilder.andWhere('user.is_verified = :isVerified', { isVerified });
      }

      if (trustScoreMin !== undefined) {
        queryBuilder.andWhere('user.trust_score >= :trustScoreMin', { trustScoreMin });
      }

      if (trustScoreMax !== undefined) {
        queryBuilder.andWhere('user.trust_score <= :trustScoreMax', { trustScoreMax });
      }

      if (dateFrom) {
        queryBuilder.andWhere('user.created_at >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('user.created_at <= :dateTo', { dateTo });
      }

      // Age filtering logic needs date math, assuming date_of_birth is stored
      if (min_age) {
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - min_age);
        queryBuilder.andWhere('user.date_of_birth <= :minDate', { minDate });
      }

      if (max_age) {
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() - max_age - 1);
        queryBuilder.andWhere('user.date_of_birth > :maxDate', { maxDate });
      }

      // Sorting
      if (sortBy) {
        let sortColumn = `user.${sortBy}`;
        // Validate column to prevent SQL injection or errors
        const allowedSortColumns = ['created_at', 'trust_score', 'display_name', 'email', 'status', 'role'];
        if (!allowedSortColumns.includes(sortBy)) {
           sortColumn = 'user.created_at';
        } else {
           sortColumn = `user.${sortBy}`;
        }
        
        queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');
      } else {
        queryBuilder.orderBy('user.created_at', 'DESC');
      }

      // Pagination
      queryBuilder.skip(offset).take(limit);

      const [users, totalCount] = await queryBuilder.getManyAndCount();

      const mappedUsers = plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      });

      return {
        users: mappedUsers,
        total_count: totalCount,
        offset,
        limit,
        has_more: offset + limit < totalCount,
      };
    } catch (error) {
      this.logger.error('Error fetching users', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async getUserRole(id: string): Promise<UserRoleResponseDto> {
    const user = await this.userRepository.findOne({ where: { user_id: id }, select: ['user_id', 'role'] });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { user_id: user.user_id, role: user.role };
  }

  async updateUserStatus(id: string, updateDto: UpdateUserStatusDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.status = updateDto.status;
    const savedUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async updateUserRole(id: string, updateDto: UpdateUserRoleDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.role = updateDto.role;
    const savedUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async updateVerificationStatus(id: string, updateDto: UpdateVerificationStatusDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.is_verified = updateDto.status === 'verified';
    
    const savedUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async recalculateTrustScore(id: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    let score = 50; // Base score

    if (user.is_verified) score += 30;
    if (user.bio && user.bio.length > 10) score += 10;
    if (user.avatar_url) score += 10;
    if (user.linkedin_handle || user.instagram_handle) score += 10;
    
    // Penalties
    if (user.status === 'suspended') score -= 20;
    if (user.status === 'banned') score -= 50;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    user.trust_score = score;
    await this.userRepository.save(user);
    
    return score;
  }

  async getUserStats(): Promise<UserStatsDto> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { status: 'active' } });
    const verifiedUsers = await this.userRepository.count({ where: { is_verified: true } });
    
    const { avg } = await this.userRepository
      .createQueryBuilder('user')
      .select('AVG(user.trust_score)', 'avg')
      .getRawOne();
      
    // Mock growth data
    const userGrowth = 5.2; 
    const activeGrowth = 3.8;
    const verificationGrowth = 1.2;
    const trustScoreChange = 0.5;

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      avgTrustScore: parseFloat(avg) || 0,
      userGrowth,
      activeGrowth,
      verificationGrowth,
      trustScoreChange,
    };
  }

  async getAnalyticsOverview(filter: AnalyticsFilterDto): Promise<any> {
    const { date_range = 'month', start_date, end_date } = filter;
    
    // Execute queries in parallel for better performance
    const [overviewResult, userAnalyticsResult, contentAnalyticsResult, revenueAnalyticsResult] = await Promise.all([
      this.userRepository.query(
        'SELECT * FROM get_analytics_overview($1, $2, $3)',
        [date_range, start_date || null, end_date || null],
      ),
      this.userRepository.query('SELECT get_user_analytics($1) as data', [date_range]),
      this.userRepository.query('SELECT get_content_analytics($1) as data', [date_range]),
      this.userRepository.query('SELECT get_revenue_analytics($1) as data', [date_range])
    ]);

    const overview = overviewResult[0];
    const userAnalytics = userAnalyticsResult[0].data;
    const contentAnalytics = contentAnalyticsResult[0].data;
    const revenueAnalytics = revenueAnalyticsResult[0].data;

    return {
      ...overview,
      ...userAnalytics,
      ...contentAnalytics,
      ...revenueAnalytics,
      // Map specific fields required by frontend
      new_users_30d: userAnalytics.new_users_this_month,
      new_users_7d: userAnalytics.new_users_this_week,
      meetups_created: contentAnalytics.total_meetups,
      events_created: contentAnalytics.total_events,
      // Default values for missing fields to prevent UI errors
      reports_opened: overview.total_reports || 0,
      reports_resolved: 0, // Not currently returned by SQL functions
      growth_rate: userAnalytics.user_growth_rate || 0,
      churn_rate: 0
    };
  }
}

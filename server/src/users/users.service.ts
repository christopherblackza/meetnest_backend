import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { SupabaseService } from '../supabase/supabase.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';
import { User } from './entities/user.entity';

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
      } = query;

      const queryBuilder = this.userRepository.createQueryBuilder('user');

      // Apply filters
      if (search_term) {
        queryBuilder.andWhere(
          '(user.display_name ILIKE :search OR user.full_name ILIKE :search OR user.bio ILIKE :search)',
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

      // Pagination
      queryBuilder.orderBy('user.created_at', 'DESC').skip(offset).take(limit);

      const [users, totalCount] = await queryBuilder.getManyAndCount();

      // We need to map the TypeORM entity to the response DTO
      // Note: Some fields like notifications_enabled might be missing in the entity if they are in other tables (e.g. user_preferences)
      // For now, mapping what we have in the User entity.
      // If we need joined data (preferences, push tokens), we should update the entity relations or keep using the complex query.
      // Assuming for now the User entity covers the main profile data.

      const userDtos: UserResponseDto[] = users.map((user) =>
        this.mapToDto(user),
      );

      const hasMore = offset + limit < totalCount;

      this.logger.log(`Successfully fetched ${users.length} users`, {
        totalCount,
        offset,
        limit,
        hasMore,
      });

      return {
        users: userDtos,
        total_count: totalCount,
        offset,
        limit,
        has_more: hasMore,
      };
    } catch (error) {
      this.logger.error('Error in getUsers service', {
        error: error.message,
        query,
      });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    try {
      this.logger.log(`Fetching user by ID: ${userId}`);

      const user = await this.userRepository.findOne({
        where: { user_id: userId },
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const userResponse = this.mapToDto(user);

      this.logger.log(`Successfully fetched user: ${userId}`);
      return userResponse;
    } catch (error) {
      this.logger.error('Error in getUserById service', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  private mapToDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUserRole(userId: string): Promise<UserRoleResponseDto> {
    try {
      this.logger.log(`Fetching user role by ID: ${userId}`);

      const user = await this.userRepository.findOne({
        where: { user_id: userId },
        select: ['user_id', 'role'],
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return plainToInstance(UserRoleResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error('Error in getUserRole service', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

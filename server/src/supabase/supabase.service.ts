import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      this.logger.error('Supabase URL and Service Role Key must be provided');
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    this.logger.log('Supabase client initialized successfully');
  }

  get client() {
    return this.supabase;
  }

  async uploadFile(bucket: string, path: string, file: Buffer, mimeType: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Error uploading file to ${path}: ${error.message}`);
      
      // Handle Supabase error status code potentially being a string or undefined
      const status = (error as any).status || (error as any).statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const statusCode = Number(status) || HttpStatus.INTERNAL_SERVER_ERROR;
      
      throw new HttpException(error.message, statusCode);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  }

  async deleteFile(bucket: string, path: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      this.logger.error(`Error deleting file from ${path}: ${error.message}`);
      
      // Handle Supabase error status code potentially being a string or undefined
      const status = (error as any).status || (error as any).statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      const statusCode = Number(status) || HttpStatus.INTERNAL_SERVER_ERROR;
      
      throw new HttpException(error.message, statusCode);
    }
  }

  async getUserDeviceToken(userId: string): Promise<string | null> {
    try {
      this.logger.log(`Fetching device token for user: ${userId}`);

      const { data, error } = await this.supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (error) {
        this.logger.error('Error fetching device token', {
          userId,
          error: error.message,
        });
        return null;
      }

      const token = data?.token || null;
      this.logger.log(`Device token fetch result for user ${userId}`, {
        hasToken: !!token,
      });

      return token;
    } catch (error) {
      this.logger.error('Unexpected error fetching device token', {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  async getActivityDetails(activityId: string): Promise<any> {
    try {
      this.logger.log(`Fetching activity details for: ${activityId}`);

      const { data, error } = await this.supabase
        .from('activities')
        .select(
          `
          id,
          title,
          description,
          meeting_time,
          location_city,
          location_country,
          latitude,
          longitude,
          created_by,
          user_profiles!activities_created_by_fkey(display_name, avatar_url)
        `,
        )
        .eq('id', activityId)
        .single();

      if (error) {
        this.logger.error('Error fetching activity details', {
          activityId,
          error: error.message,
        });
        return null;
      }

      this.logger.log(
        `Activity details fetched successfully for: ${activityId}`,
      );
      return data;
    } catch (error) {
      this.logger.error('Unexpected error fetching activity details', {
        activityId,
        error: error.message,
      });
      return null;
    }
  }

  async getNearbyUsersWithTokens(
    lat: number,
    lng: number,
    radiusKm: number = 10,
  ): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching users within ${radiusKm}km of coordinates: ${lat}, ${lng}`,
      );

      // Using Haversine formula to calculate distance
      const { data, error } = await this.supabase.rpc(
        'get_nearby_users_with_tokens',
        {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radiusKm,
        },
      );

      if (error) {
        this.logger.error('Error fetching nearby users', {
          error: error.message,
        });

        // Fallback: use a simpler query if the RPC function doesn't exist
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .from('user_profiles')
          .select(
            `
            user_id,
            display_name,
            latitude,
            longitude,
            user_push_tokens!inner(token)
          `,
          )
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .not('user_push_tokens.token', 'is', null);

        if (fallbackError) {
          this.logger.error('Fallback query also failed', {
            error: fallbackError.message,
          });
          return [];
        }

        // Filter by distance in JavaScript (less efficient but works)
        const nearbyUsers =
          fallbackData?.filter((user) => {
            const distance = this.calculateDistance(
              lat,
              lng,
              user.latitude,
              user.longitude,
            );
            return distance <= radiusKm;
          }) || [];

        this.logger.log(
          `Found ${nearbyUsers.length} nearby users (fallback method)`,
        );
        return nearbyUsers;
      }

      this.logger.log(
        `Found ${data?.length || 0} nearby users with push tokens`,
      );
      return data || [];
    } catch (error) {
      this.logger.error('Unexpected error fetching nearby users', {
        error: error.message,
      });
      return [];
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      this.logger.log(`Fetching user profile for: ${userId}`);

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        this.logger.error('Error fetching user profile', {
          userId,
          error: error.message,
        });
        return null;
      }

      this.logger.log(`User profile fetched successfully for: ${userId}`);
      return data;
    } catch (error) {
      this.logger.error('Unexpected error fetching user profile', {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}

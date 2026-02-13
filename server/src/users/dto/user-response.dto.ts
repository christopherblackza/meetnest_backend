import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Display name' })
  display_name?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Full name' })
  full_name?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'User bio' })
  bio?: string;

  @Expose()
  @Transform(({ obj }) => {
    if (!obj.date_of_birth) return undefined;
    const birthDate = new Date(obj.date_of_birth);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  })
  @ApiPropertyOptional({ description: 'User age' })
  age?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Occupation' })
  occupation?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Country of origin' })
  country_of_origin?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Current city' })
  current_city?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Current country' })
  current_country?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatar_url?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Instagram handle' })
  instagram_handle?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Latitude (only if user allows location sharing)',
  })
  latitude?: number;

  @Expose()
  @ApiPropertyOptional({
    description: 'Longitude (only if user allows location sharing)',
  })
  longitude?: number;

  @Expose()
  @ApiPropertyOptional({ description: 'Gender' })
  gender?: string;

  @Expose()
  @ApiProperty({ description: 'Whether user is verified' })
  is_verified: boolean;

  @Expose()
  @ApiProperty({ description: 'User role' })
  role: string;

  @Expose()
  @ApiProperty({ description: 'Authentication provider' })
  auth_provider: string;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value).toISOString() : ''))
  @ApiProperty({ description: 'Account creation date' })
  created_at: string;

  @Expose()
  @Transform(({ value }) => value ?? true)
  @ApiProperty({ description: 'Whether user allows location sharing' })
  show_location: boolean = true;

  @Expose()
  @Transform(({ value }) => value ?? true)
  @ApiProperty({ description: 'Whether user allows messages' })
  allow_messages: boolean = true;

  @Expose()
  @Transform(({ value }) => value ?? 'en')
  @ApiProperty({ description: 'User language preference' })
  language: string = 'en';

  @Expose()
  @Transform(({ value }) => value ?? true)
  @ApiProperty({ description: 'Whether notifications are enabled' })
  notifications_enabled: boolean = true;

  @Expose()
  @ApiPropertyOptional({ description: 'Push notification token' })
  push_token?: string;
}

export class UsersListResponseDto {
  @ApiProperty({ type: [UserResponseDto], description: 'List of users' })
  users: UserResponseDto[];

  @ApiProperty({ description: 'Total number of users matching the criteria' })
  total_count: number;

  @ApiProperty({ description: 'Current page offset' })
  offset: number;

  @ApiProperty({ description: 'Number of users per page' })
  limit: number;

  @ApiProperty({ description: 'Whether there are more users available' })
  has_more: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ActivityJoinNotificationDto {
  @ApiProperty({ description: 'Activity ID that was joined' })
  @IsUUID()
  activity_id: string;

  @ApiProperty({ description: 'User ID who joined the activity' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Activity creator ID (who will receive the notification)' })
  @IsUUID()
  creator_id: string;

  @ApiProperty({ description: 'Activity title/name' })
  @IsString()
  activity_title: string;

  @ApiProperty({ description: 'User display name who joined' })
  @IsString()
  joiner_display_name: string;

  @ApiProperty({ description: 'User avatar URL who joined', required: false })
  @IsOptional()
  @IsString()
  joiner_avatar_url?: string;

  @ApiProperty({ description: 'Whether the joiner is the creator', required: false })
  @IsOptional()
  @IsBoolean()
  is_creator?: string;
}
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class ActivityLocationNotificationDto {
  @ApiProperty({ description: 'User ID who will receive the notification' })
  @IsUUID()
  recipient_id: string;

  @ApiProperty({ description: 'Activity ID that was created' })
  @IsUUID()
  activity_id: string;

  @ApiProperty({ description: 'Activity title/name' })
  @IsString()
  activity_title: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  activity_description: string;

  @ApiProperty({ description: 'Meeting time for the activity' })
  @IsDateString()
  meeting_time: string;

  @ApiProperty({ description: 'City where the activity is located' })
  @IsString()
  location_city: string;

  @ApiProperty({ description: 'Country where the activity is located' })
  @IsString()
  location_country: string;

  @ApiProperty({ description: 'User ID who created the activity' })
  @IsUUID()
  creator_id: string;

  @ApiProperty({
    description: 'Distance in kilometers from the recipient to the activity',
  })
  @IsNumber()
  distance_km: number;

  @ApiProperty({ description: 'Notification type', default: 'activity_nearby' })
  @IsOptional()
  @IsString()
  type?: string;
}

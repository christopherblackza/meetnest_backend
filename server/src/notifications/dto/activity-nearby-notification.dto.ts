import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber } from 'class-validator';

export class ActivityNearbyNotificationDto {
  @ApiProperty({ description: 'Activity ID that was created' })
  @IsUUID()
  activityId: string;

  @ApiProperty({ description: 'Activity latitude coordinate' })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Activity longitude coordinate' })
  @IsNumber()
  lng: number;
}

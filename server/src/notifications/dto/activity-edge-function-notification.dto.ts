import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Activity title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Meeting time' })
  @IsString()
  meeting_time: string;
}

class CreatorDto {
  @ApiProperty({ description: 'Creator user ID' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Creator display name' })
  @IsString()
  display_name: string;

  @ApiProperty({ description: 'Creator avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}

class RecipientDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Recipient display name' })
  @IsString()
  display_name: string;

  @ApiProperty({ description: 'Push notification token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Distance from activity in kilometers' })
  @IsNumber()
  distance_km: number;
}

export class ActivityEdgeFunctionNotificationDto {
  @ApiProperty({ description: 'Activity details', type: ActivityDto })
  @ValidateNested()
  @Type(() => ActivityDto)
  activity: ActivityDto;

  @ApiProperty({ description: 'Activity creator details', type: CreatorDto })
  @ValidateNested()
  @Type(() => CreatorDto)
  creator: CreatorDto;

  @ApiProperty({
    description: 'List of nearby users to notify',
    type: [RecipientDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients: RecipientDto[];
}

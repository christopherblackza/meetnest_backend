import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class DmNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  recipient_id: string;

  @ApiProperty({ description: 'Sender user ID' })
  @IsUUID()
  sender_id: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Sender display name' })
  @IsString()
  sender_display_name: string;

  @ApiProperty({ description: 'Sender avatar URL', required: false })
  @IsOptional()
  @IsString()
  sender_avatar_url?: string;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

export class FriendRequestNotificationDto {
  @ApiProperty({ description: 'Receiver user ID (who receives the friend request)' })
  @IsUUID()
  receiver_id: string;

  @ApiProperty({ description: 'Sender user ID (who sent the friend request)' })
  @IsUUID()
  sender_id: string;

  @ApiProperty({ description: 'Sender display name' })
  @IsString()
  sender_display_name: string;

  @ApiProperty({ description: 'Sender avatar URL', required: false })
  @IsOptional()
  @IsString()
  sender_avatar_url?: string;

  @ApiProperty({ description: 'Friend request ID', required: false })
  @IsOptional()
  @IsUUID()
  friend_request_id?: string;
}
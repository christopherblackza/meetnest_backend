import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class FounderMessageDto {
  @ApiProperty({
    description: 'Message content from founder',
    example: 'This is a test message from the founder',
  })
  @IsString()
  my_message: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Message from Wandermundo',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Firebase topic to send to',
    example: 'role_User',
    required: false,
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({
    description: 'Avatar URL of the founder',
    example: 'https://example.com/founder-avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}

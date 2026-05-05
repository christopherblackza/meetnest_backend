import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class FounderMessageUserDto {
  @ApiProperty({
    description: 'Target user ID to send the message to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  user_id: string;

  @ApiProperty({
    description: 'Message content from founder',
    example: 'Hey! Welcome to Meetro — let me know if you need anything.',
  })
  @IsString()
  my_message: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Message from Founder',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Avatar URL of the founder',
    example: 'https://example.com/founder-avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}

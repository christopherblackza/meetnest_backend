import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'New status for the user', enum: ['active', 'suspended', 'banned'] })
  @IsString()
  @IsIn(['active', 'suspended', 'banned'])
  status: string;
}

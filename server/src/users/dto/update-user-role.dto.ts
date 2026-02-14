import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({ description: 'New role for the user', enum: ['user', 'moderator', 'admin'] })
  @IsString()
  @IsIn(['user', 'moderator', 'admin'])
  role: string;
}

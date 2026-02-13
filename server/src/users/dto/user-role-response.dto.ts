import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserRoleResponseDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @Expose()
  @ApiProperty({ description: 'User role' })
  role: string;
}

import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVerificationStatusDto {
  @ApiProperty({ description: 'New verification status', enum: ['verified', 'rejected', 'pending'] })
  @IsString()
  @IsIn(['verified', 'rejected', 'pending'])
  status: string;
}

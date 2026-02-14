import { ApiProperty } from '@nestjs/swagger';

export class UserStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  verifiedUsers: number;

  @ApiProperty()
  avgTrustScore: number;

  @ApiProperty()
  userGrowth: number;

  @ApiProperty()
  activeGrowth: number;

  @ApiProperty()
  verificationGrowth: number;

  @ApiProperty()
  trustScoreChange: number;
}

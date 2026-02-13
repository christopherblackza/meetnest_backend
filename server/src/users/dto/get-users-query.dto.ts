import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Number of users to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of users to skip for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Search term for display name, full name, or bio',
  })
  @IsOptional()
  @IsString()
  search_term?: string;

  @ApiPropertyOptional({ description: 'Filter by current city' })
  @IsOptional()
  @IsString()
  current_city?: string;

  @ApiPropertyOptional({ description: 'Filter by current country' })
  @IsOptional()
  @IsString()
  current_country?: string;

  @ApiPropertyOptional({ description: 'Filter by country of origin' })
  @IsOptional()
  @IsString()
  country_of_origin?: string;

  @ApiPropertyOptional({ description: 'Filter by gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    description: 'Minimum age filter',
    minimum: 18,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  min_age?: number;

  @ApiPropertyOptional({
    description: 'Maximum age filter',
    minimum: 18,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  max_age?: number;

  @ApiPropertyOptional({ description: 'User ID to exclude from results' })
  @IsOptional()
  @IsString()
  exclude_user_id?: string;
}

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsArray, IsUrl, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType } from '../entities/client.entity';

const CLIENT_TYPES: ClientType[] = ['bar', 'restaurant', 'cafe', 'gym', 'market', 'volunteering', 'social'];

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(CLIENT_TYPES)
  type: ClientType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @IsUrl()
  @IsOptional()
  googleMapsLink?: string;

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rating?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  image_url?: string[];

  @IsString()
  @IsOptional()
  logo_url?: string;
}

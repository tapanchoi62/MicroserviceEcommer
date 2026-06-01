import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateBrandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

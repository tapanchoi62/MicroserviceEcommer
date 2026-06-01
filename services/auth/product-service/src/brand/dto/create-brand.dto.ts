import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'apple' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

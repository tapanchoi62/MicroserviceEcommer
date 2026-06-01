import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsArray,
  IsIn,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'iphone-15-pro' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: 'Latest iPhone model' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ example: 'active', enum: ['draft', 'active', 'archived'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({ example: ['category-id-1', 'category-id-2'] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];
}

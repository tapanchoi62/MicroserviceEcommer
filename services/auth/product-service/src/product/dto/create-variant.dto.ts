import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDecimal,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VariantAttributeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateVariantDto {
  @ApiProperty({ example: 'IPHONE15PRO-256GB' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: '999.99' })
  @IsDecimal()
  @IsNotEmpty()
  price: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  comparePrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  weight?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MembersQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'STAFF',
    description: 'Filter by role name',
    enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'], {
    message: 'role filter must be one of: SUPER_ADMIN, ADMIN, STAFF, CUSTOMER',
  })
  role?: string;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by full name or email (case-insensitive, partial match)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

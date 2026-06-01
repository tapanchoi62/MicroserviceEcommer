import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    example: 'active',
    description: 'User account status',
    enum: ['active', 'inactive', 'banned'],
  })
  @IsString()
  @IsIn(['active', 'inactive', 'banned'])
  status: string;
}

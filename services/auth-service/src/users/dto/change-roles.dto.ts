import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

export class ChangeRolesDto {
  @ApiProperty({
    example: ['ADMIN', 'STAFF'],
    description:
      'Complete list of roles to assign — replaces ALL existing roles of the user.' +
      ' At least one role is required. Allowed values: SUPER_ADMIN, ADMIN, STAFF, CUSTOMER.',
    enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'roles must contain at least one role' })
  @ArrayMaxSize(10, { message: 'roles must contain at most 10 entries' })
  @IsString({ each: true })
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'], {
    each: true,
    message: 'Each role must be one of: SUPER_ADMIN, ADMIN, STAFF, CUSTOMER',
  })
  roles: string[];
}

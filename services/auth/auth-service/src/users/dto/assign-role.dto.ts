import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'Role name to assign',
    enum: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'], {
    message: 'role must be one of: SUPER_ADMIN, ADMIN, STAFF, CUSTOMER',
  })
  role: string;
}

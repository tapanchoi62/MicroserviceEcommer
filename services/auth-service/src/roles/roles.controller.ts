import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Roles (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─── List all roles ───────────────────────────────────────
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all roles and their permissions' })
  findAll() {
    return this.rolesService.findAll();
  }

  // ─── Get role by ID ───────────────────────────────────────
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get role details by ID' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  // ─── Create custom role ───────────────────────────────────
  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new custom role (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto.name, dto.description);
  }
}

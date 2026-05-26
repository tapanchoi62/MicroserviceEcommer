import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ChangeRolesDto } from './dto/change-roles.dto';
import { MembersQueryDto } from './dto/members-query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Users (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── List all users ───────────────────────────────────────
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  // ─── Get own profile (any authenticated user) ─────────────
  @Get('me')
  @ApiOperation({ summary: 'Get current user (same as /auth/profile)' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  // ─── List members with roles ───────────────────────────────
  @Get('members')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'List members with their roles (paginated, searchable)',
    description:
      '**ADMIN** sees only users whose highest role is STAFF or CUSTOMER.\n\n' +
      '**SUPER_ADMIN** sees every user.\n\n' +
      'Supports optional `role` filter (exact match) and `search` (partial ' +
      'match on full name or e-mail, case-insensitive).',
  })
  @ApiQuery({ name: 'page',   required: false, example: 1,       description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit',  required: false, example: 20,      description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'role',   required: false, example: 'STAFF', description: 'Filter by role name' })
  @ApiQuery({ name: 'search', required: false, example: 'john',  description: 'Search by name or email' })
  @ApiResponse({ status: 200, description: 'Paginated member list with roles' })
  findMembers(
    @CurrentUser() caller: JwtPayload,
    @Query() query: MembersQueryDto,
  ) {
    return this.usersService.findMembers(
      query.page  ?? 1,
      query.limit ?? 20,
      caller.roles,
      query.role,
      query.search,
    );
  }

  // ─── Get user by ID ───────────────────────────────────────
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ─── Assign role ──────────────────────────────────────────
  @Post(':id/roles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  assignRole(
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto.role);
  }

  // ─── Update member roles (hierarchy-aware, ADMIN + SUPER_ADMIN) ──────────
  @Patch(':id/roles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update member roles — hierarchy-aware (ADMIN + SUPER_ADMIN)',
    description:
      '**ADMIN** — can only modify users whose highest role is STAFF or CUSTOMER, ' +
      'and can only assign STAFF / CUSTOMER roles. Cannot change own account.\n\n' +
      '**SUPER_ADMIN** — can modify any user\'s roles (blocked only by last-super-admin guard). ' +
      'Cannot change own account via this endpoint (use PUT /users/:id/roles).',
  })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiBody({ type: ChangeRolesDto })
  @ApiResponse({ status: 200, description: 'Roles updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient privilege or own-account edit' })
  @ApiResponse({ status: 404, description: 'User or one of the roles not found' })
  @ApiResponse({ status: 409, description: 'Cannot remove last SUPER_ADMIN' })
  updateMemberRoles(
    @CurrentUser() caller: JwtPayload,
    @Param('id') targetUserId: string,
    @Body() dto: ChangeRolesDto,
  ) {
    return this.usersService.updateMemberRoles(
      caller.sub,
      caller.roles,
      targetUserId,
      dto.roles,
    );
  }

  // ─── Change roles (full replace) ──────────────────────────
  @Put(':id/roles')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Replace ALL roles of a user (SUPER_ADMIN only)',
    description:
      'Atomically removes every existing role and assigns the provided set. ' +
      'At least one role is required. ' +
      'Guard: cannot strip SUPER_ADMIN from the last remaining super-admin.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Roles replaced successfully' })
  @ApiResponse({ status: 404, description: 'User or one of the roles not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot remove SUPER_ADMIN — last super-admin in the system',
  })
  changeRoles(
    @Param('id') userId: string,
    @Body() dto: ChangeRolesDto,
  ) {
    return this.usersService.changeRoles(userId, dto.roles);
  }

  // ─── Remove role ──────────────────────────────────────────
  @Delete(':id/roles/:role')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove a role from a user (SUPER_ADMIN only)' })
  @ApiParam({ name: 'id',   description: 'User UUID' })
  @ApiParam({ name: 'role', description: 'Role name', example: 'STAFF' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  removeRole(
    @Param('id')   userId: string,
    @Param('role') role: string,
  ) {
    return this.usersService.removeRole(userId, role);
  }

  // ─── Update status ────────────────────────────────────────
  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user account status (active / inactive / banned)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.status);
  }

  // ─── Get user permissions ─────────────────────────────────
  @Get(':id/permissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all permissions for a user (via their roles)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  getPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }
}

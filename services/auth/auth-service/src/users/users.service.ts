import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/** Privilege level map — higher number = more authority */
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  STAFF: 1,
  CUSTOMER: 0,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          userRoles: { include: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async assignRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  async removeRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId: role.id } },
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    const permissions = new Set<string>();

    for (const userRole of user.userRoles) {
      for (const rp of userRole.role.rolePermissions) {
        permissions.add(rp.permission.name);
      }
    }

    return Array.from(permissions);
  }

  /**
   * List members with their roles.
   *
   * - ADMIN caller  → excludes users who hold ADMIN or SUPER_ADMIN roles.
   * - SUPER_ADMIN   → returns all users.
   * Supports optional `role` filter and `search` (name / email).
   */
  async findMembers(
    page: number,
    limit: number,
    callerRoles: string[],
    roleFilter?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const isSuperAdmin = callerRoles.includes('SUPER_ADMIN');

    // Prisma AND conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [];

    // ADMIN restriction — hide peers and superiors
    if (!isSuperAdmin) {
      andConditions.push({
        userRoles: {
          none: { role: { name: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
        },
      });
    }

    // Role filter
    if (roleFilter) {
      andConditions.push({
        userRoles: { some: { role: { name: roleFilter } } },
      });
    }

    // Name / email search
    if (search) {
      andConditions.push({
        OR: [
          { email:    { contains: search, mode: 'insensitive' as const } },
          { fullName: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    const where = andConditions.length ? { AND: andConditions } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          status: true,
          provider: true,
          createdAt: true,
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Hierarchy-aware role update (ADMIN + SUPER_ADMIN).
   *
   * ADMIN rules:
   *   - Cannot modify own account.
   *   - Cannot target a user whose highest role ≥ ADMIN (level 2).
   *   - Can only assign STAFF or CUSTOMER (level < 2).
   *
   * SUPER_ADMIN rules:
   *   - Cannot modify own account.
   *   - Can assign any roles.
   *   - Last-SUPER_ADMIN guard still applies.
   */
  async updateMemberRoles(
    callerId: string,
    callerRoles: string[],
    targetUserId: string,
    roleNames: string[],
  ) {
    const isSuperAdmin = callerRoles.includes('SUPER_ADMIN');
    const callerMaxLevel = Math.max(
      ...callerRoles.map((r) => ROLE_LEVEL[r] ?? -1),
    );

    // Cannot edit own account
    if (callerId === targetUserId) {
      throw new ForbiddenException('Cannot change your own roles via this endpoint');
    }

    // Load target user with current roles
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!target) throw new NotFoundException('User not found');

    const targetMaxLevel = target.userRoles.length
      ? Math.max(...target.userRoles.map((ur) => ROLE_LEVEL[ur.role.name] ?? -1))
      : -1;

    // ADMIN cannot touch peers or superiors
    if (!isSuperAdmin && targetMaxLevel >= callerMaxLevel) {
      throw new ForbiddenException(
        'Cannot modify roles of a user with equal or higher privilege level',
      );
    }

    // Validate requested role names exist in DB
    const uniqueNames = [...new Set(roleNames)];
    const roles = await this.prisma.role.findMany({
      where: { name: { in: uniqueNames } },
    });
    if (roles.length !== uniqueNames.length) {
      const found = roles.map((r) => r.name);
      const missing = uniqueNames.filter((n) => !found.includes(n));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    // ADMIN cannot assign roles at their own level or above
    if (!isSuperAdmin) {
      const forbidden = uniqueNames.filter(
        (n) => (ROLE_LEVEL[n] ?? -1) >= callerMaxLevel,
      );
      if (forbidden.length) {
        throw new ForbiddenException(
          `ADMIN cannot assign: ${forbidden.join(', ')}. Allowed: STAFF, CUSTOMER`,
        );
      }
    }

    // SUPER_ADMIN: last-super-admin safety check
    if (isSuperAdmin) {
      const keptSuperAdmin = roles.some((r) => r.name === 'SUPER_ADMIN');
      if (!keptSuperAdmin) {
        const isTargetSuperAdmin = target.userRoles.some(
          (ur) => ur.role.name === 'SUPER_ADMIN',
        );
        if (isTargetSuperAdmin) {
          const totalSuperAdmins = await this.prisma.userRole.count({
            where: { role: { name: 'SUPER_ADMIN' } },
          });
          if (totalSuperAdmins <= 1) {
            throw new ConflictException(
              'Cannot remove SUPER_ADMIN: at least one SUPER_ADMIN must exist in the system',
            );
          }
        }
      }
    }

    // Atomic replace
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: targetUserId } });
      return Promise.all(
        roles.map((role) =>
          tx.userRole.create({ data: { userId: targetUserId, roleId: role.id } }),
        ),
      );
    });

    return {
      message: `Roles updated successfully for user ${targetUserId}`,
      assignedRoles: roles.map((r) => r.name),
      userRoles: created,
    };
  }

  /**
   * Replace ALL roles of a user with the provided set (SUPER_ADMIN only).
   * Safety check: cannot strip SUPER_ADMIN from the last remaining super-admin.
   */
  async changeRoles(userId: string, roleNames: string[]) {
    // 1. Validate user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 2. Validate all requested role names exist in DB
    const uniqueNames = [...new Set(roleNames)];
    const roles = await this.prisma.role.findMany({
      where: { name: { in: uniqueNames } },
    });

    if (roles.length !== uniqueNames.length) {
      const found = roles.map((r) => r.name);
      const missing = uniqueNames.filter((n) => !found.includes(n));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    // 3. Safety: if the new set does NOT include SUPER_ADMIN, make sure the user
    //    is not the only SUPER_ADMIN left in the system.
    const keptSuperAdmin = roles.some((r) => r.name === 'SUPER_ADMIN');

    if (!keptSuperAdmin) {
      const currentRoles = await this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      });
      const isCurrentSuperAdmin = currentRoles.some(
        (ur) => ur.role.name === 'SUPER_ADMIN',
      );

      if (isCurrentSuperAdmin) {
        const totalSuperAdmins = await this.prisma.userRole.count({
          where: { role: { name: 'SUPER_ADMIN' } },
        });

        if (totalSuperAdmins <= 1) {
          throw new ConflictException(
            'Cannot remove SUPER_ADMIN: at least one SUPER_ADMIN must exist in the system',
          );
        }
      }
    }

    // 4. Replace roles atomically inside a transaction
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      return Promise.all(
        roles.map((role) =>
          tx.userRole.create({ data: { userId, roleId: role.id } }),
        ),
      );
    });

    return {
      message: `Roles updated successfully for user ${userId}`,
      assignedRoles: roles.map((r) => r.name),
      userRoles: created,
    };
  }
}

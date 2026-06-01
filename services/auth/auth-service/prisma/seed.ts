import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Roles ────────────────────────────────────────────────────────────────
  const roleNames = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'];
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
  }
  console.log('✅ Roles seeded:', roleNames.join(', '));

  // ── Permissions ──────────────────────────────────────────────────────────
  const permissions = [
    'product.create', 'product.read', 'product.update', 'product.delete',
    'order.create',   'order.read',   'order.update',   'order.delete',
    'user.create',    'user.read',    'user.update',    'user.delete',
    'inventory.read', 'inventory.update',
    'role.assign',    'role.remove',
  ];
  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ Permissions seeded');

  // ── Assign ALL permissions to SUPER_ADMIN ────────────────────────────────
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole!.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole!.id, permissionId: perm.id },
    });
  }
  console.log('✅ All permissions assigned to SUPER_ADMIN');

  // ── Default SUPER_ADMIN user ─────────────────────────────────────────────
  const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@echoshop.local';
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';
  const ADMIN_NAME     = 'Super Admin';

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email:           ADMIN_EMAIL,
      passwordHash,
      fullName:        ADMIN_NAME,
      provider:        'local',
      isEmailVerified: true,
      status:          'active',
    },
  });

  // Assign SUPER_ADMIN role to the admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole!.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole!.id },
  });

  console.log(`✅ Super admin user ready:`);
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role    : SUPER_ADMIN`);
  console.log('');
  console.log('⚠️  Change the default password immediately in production!');
  console.log('   Override via: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

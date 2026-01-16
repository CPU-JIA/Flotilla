/**
 * Prisma Database Seed Script
 * Creates initial SUPER_ADMIN user if configured
 *
 * Usage: pnpm prisma db seed
 *
 * Configuration:
 * Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env
 * If not set, skips admin creation (use first-user auto-promotion instead)
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Check if admin credentials are configured
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('⏭️  SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set in .env');
    console.log(
      '   Skipping admin creation. Use first-user auto-promotion or register manually.\n',
    );
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // Upsert SUPER_ADMIN (idempotent - safe to run multiple times)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      username: 'admin',
      email: adminEmail,
      passwordHash: hashedPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });

  console.log('✅ SUPER_ADMIN user seeded:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin.id}\n`);

  console.log('🚨 SECURITY WARNING:');
  console.log('   Change the admin password immediately after first login!');
  console.log('   Remove SEED_ADMIN_PASSWORD from .env after initial setup.\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

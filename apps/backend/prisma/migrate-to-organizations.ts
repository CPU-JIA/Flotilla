/**
 * Data Migration Script: Create Personal Organizations for Existing Users
 *
 * This script performs a one-time data migration to:
 * 1. Create a personal organization for each existing user
 * 2. Add the user as OWNER of their personal organization
 * 3. Migrate all user's projects to their personal organization
 *
 * Usage: pnpm tsx migrate-to-organizations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique slug for an organization
 */
function generateOrgSlug(username: string, suffix = 0): string {
  const baseSlug = `user-${username.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
  return suffix > 0 ? `${baseSlug}-${suffix}` : baseSlug;
}

/**
 * Create personal organization for a user
 */
async function createPersonalOrganization(user: {
  id: string;
  username: string;
  email: string;
}) {
  console.log(`\n[${user.username}] Creating personal organization...`);

  // Generate unique slug (handle collisions)
  let slug = generateOrgSlug(user.username);
  let suffix = 0;
  let existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  while (existingOrg) {
    suffix++;
    slug = generateOrgSlug(user.username, suffix);
    existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });
  }

  // Create personal organization
  const organization = await prisma.organization.create({
    data: {
      name: `${user.username}'s Organization`,
      slug,
      description: `Personal workspace for ${user.username}`,
      isPersonal: true,
      // Add user as OWNER
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log(
    `[${user.username}] ✓ Created organization: ${organization.name} (${organization.slug})`,
  );

  return organization;
}

/**
 * Migrate user's projects to their personal organization
 */
async function migrateUserProjects(
  userId: string,
  organizationId: string,
  username: string,
) {
  // Find all projects owned by the user
  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      organizationId: null, // Only migrate projects not yet in an organization
    },
  });

  if (projects.length === 0) {
    console.log(`[${username}] No projects to migrate.`);
    return 0;
  }

  console.log(`[${username}] Migrating ${projects.length} projects...`);

  // Update all projects to belong to the personal organization
  const result = await prisma.project.updateMany({
    where: {
      id: { in: projects.map((p) => p.id) },
    },
    data: {
      organizationId,
    },
  });

  console.log(
    `[${username}] ✓ Migrated ${result.count} projects to organization`,
  );

  return result.count;
}

/**
 * Main migration function
 */
async function migrateToOrganizations() {
  console.log('========================================');
  console.log('Data Migration: Create Personal Organizations');
  console.log('========================================\n');

  try {
    // Check if migration is needed
    const existingOrgs = await prisma.organization.count();
    if (existingOrgs > 0) {
      console.warn(
        `⚠️  Warning: Found ${existingOrgs} existing organizations.`,
      );
      console.log(
        'This script is designed for initial migration. Proceed with caution.\n',
      );
    }

    // Fetch all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (users.length === 0) {
      console.log('✓ No users found. Migration not needed.');
      return;
    }

    console.log(`Found ${users.length} users to migrate.\n`);

    let successCount = 0;
    let errorCount = 0;
    let totalProjectsMigrated = 0;

    // Process each user
    for (const user of users) {
      try {
        // Check if user already has a personal organization
        const existingPersonalOrg = await prisma.organization.findFirst({
          where: {
            isPersonal: true,
            members: {
              some: {
                userId: user.id,
                role: 'OWNER',
              },
            },
          },
        });

        if (existingPersonalOrg) {
          console.log(
            `[${user.username}] ⊘ Already has personal organization: ${existingPersonalOrg.slug}`,
          );
          continue;
        }

        // Create personal organization
        const organization = await createPersonalOrganization(user);

        // Migrate projects
        const projectCount = await migrateUserProjects(
          user.id,
          organization.id,
          user.username,
        );

        totalProjectsMigrated += projectCount;
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`[${user.username}] ✗ Error:`, error.message);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Successful migrations: ${successCount}`);
    console.log(`Failed migrations: ${errorCount}`);
    console.log(`Total projects migrated: ${totalProjectsMigrated}`);
    console.log('========================================\n');

    if (errorCount === 0) {
      console.log('✓ Migration completed successfully!');
    } else {
      console.log(
        `⚠️  Migration completed with ${errorCount} errors. Please review the logs.`,
      );
    }
  } catch (error) {
    console.error('\n✗ Migration failed with critical error:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateToOrganizations()
    .then(() => {
      console.log('\nMigration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration script failed:', error);
      process.exit(1);
    });
}

export { migrateToOrganizations };

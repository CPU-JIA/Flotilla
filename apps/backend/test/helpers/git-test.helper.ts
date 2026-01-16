/**
 * Git HTTP E2E Test Helper Functions
 *
 * Provides utilities for:
 * - ✅ Creating test users with authentication
 * - ✅ Creating test projects and repositories
 * - ✅ Setting up Git credentials
 * - ✅ Cleaning up test data
 */

import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole, ProjectVisibility, MemberRole } from '@prisma/client';
import * as path from 'path';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  password: string; // Plain text password for testing
  role: UserRole;
}

export interface TestProject {
  id: string;
  name: string;
  visibility: ProjectVisibility;
  ownerId: string;
}

export interface TestRepository {
  id: string;
  projectId: string;
  defaultBranch: string;
}

/**
 * Create a test user with hashed password
 *
 * @param app NestJS application instance
 * @param options User creation options
 * @returns Created test user
 */
export async function createTestUser(
  app: INestApplication,
  options: {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
  },
): Promise<TestUser> {
  const prisma = app.get(PrismaService);

  const passwordHash = await bcrypt.hash(options.password, 10);

  const user = await prisma.user.create({
    data: {
      username: options.username,
      email: options.email,
      passwordHash,
      role: options.role || UserRole.USER,
      isActive: true,
      emailVerified: true,
    },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: options.password, // Return plain password for testing
    role: user.role,
  };
}

/**
 * Create a test organization
 *
 * @param app NestJS application instance
 * @param name Organization name
 * @returns Created organization
 */
export async function createTestOrganization(
  app: INestApplication,
  name: string = 'Test Organization',
) {
  const prisma = app.get(PrismaService);

  return prisma.organization.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    },
  });
}

/**
 * Create a test project
 *
 * @param app NestJS application instance
 * @param ownerId Project owner user ID
 * @param organizationId Organization ID
 * @param options Project creation options
 * @returns Created test project
 */
export async function createTestProject(
  app: INestApplication,
  ownerId: string,
  organizationId: string,
  options?: {
    name?: string;
    visibility?: ProjectVisibility;
    initRepository?: boolean;
  },
): Promise<TestProject> {
  const prisma = app.get(PrismaService);

  const name = options?.name || `test-repo-${Date.now()}`;

  const project = await prisma.project.create({
    data: {
      name,
      description: 'Test repository for E2E testing',
      visibility: options?.visibility || ProjectVisibility.PRIVATE,
      ownerId,
      organizationId,
      isArchived: false,
    },
  });

  // Initialize repository if requested
  if (options?.initRepository) {
    await prisma.repository.create({
      data: {
        projectId: project.id,
        defaultBranch: 'main',
        storageUsed: 0,
      },
    });
  }

  return {
    id: project.id,
    name: project.name,
    visibility: project.visibility,
    ownerId: project.ownerId,
  };
}

/**
 * Add a member to a project
 *
 * @param app NestJS application instance
 * @param projectId Project ID
 * @param userId User ID to add as member
 * @param role Member role (default: MEMBER)
 */
export async function addProjectMember(
  app: INestApplication,
  projectId: string,
  userId: string,
  role: MemberRole = MemberRole.MEMBER,
) {
  const prisma = app.get(PrismaService);

  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role,
    },
  });
}

/**
 * Generate Git HTTP Basic Auth credentials
 *
 * @param username Username or email
 * @param password Plain text password
 * @returns Base64 encoded credentials for Authorization header
 */
export function generateBasicAuthHeader(
  username: string,
  password: string,
): string {
  const credentials = `${username}:${password}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  return `Basic ${base64Credentials}`;
}

/**
 * Clean up test users
 *
 * @param app NestJS application instance
 * @param userIds User IDs to delete
 */
export async function cleanupTestUsers(
  app: INestApplication,
  userIds: string[],
) {
  const prisma = app.get(PrismaService);

  await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
    },
  });
}

/**
 * Clean up test projects
 *
 * @param app NestJS application instance
 * @param projectIds Project IDs to delete
 */
export async function cleanupTestProjects(
  app: INestApplication,
  projectIds: string[],
) {
  const prisma = app.get(PrismaService);

  // Delete repositories first (foreign key constraint)
  await prisma.repository.deleteMany({
    where: {
      projectId: { in: projectIds },
    },
  });

  // Delete project members
  await prisma.projectMember.deleteMany({
    where: {
      projectId: { in: projectIds },
    },
  });

  // Delete projects
  await prisma.project.deleteMany({
    where: {
      id: { in: projectIds },
    },
  });
}

/**
 * Clean up test organizations
 *
 * @param app NestJS application instance
 * @param organizationIds Organization IDs to delete
 */
export async function cleanupTestOrganizations(
  app: INestApplication,
  organizationIds: string[],
) {
  const prisma = app.get(PrismaService);

  await prisma.organization.deleteMany({
    where: {
      id: { in: organizationIds },
    },
  });
}

/**
 * Wait for a condition to be true
 *
 * @param condition Async function that returns boolean
 * @param timeout Maximum wait time in milliseconds
 * @param interval Check interval in milliseconds
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Get project's repository path
 *
 * @param projectId Project ID
 * @returns Full repository path
 */
export function getTestRepoPath(projectId: string): string {
  const reposDir = path.join(
    __dirname,
    '../../repos', // Relative to test/helpers
  );
  return path.join(reposDir, projectId);
}

/**
 * Assignees 数据迁移脚本
 *
 * 🔒 DATA MIGRATION: 将 assigneeIds String[] 迁移到 IssueAssignee/PRAssignee 关联表
 *
 * ECP-C1: 防御性编程 - 事务保证数据一致性
 * ECP-D2: The Art of Commenting - 详细的迁移步骤说明
 *
 * 使用场景:
 * - 生产环境首次部署新schema时执行
 * - 保留现有assigneeIds数据，迁移到关联表
 *
 * 执行方式:
 * ```bash
 * cd apps/backend
 * ts-node -r tsconfig-paths/register prisma/migrate-assignees.ts
 * ```
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateIssueAssignees() {
  console.log('🔄 Migrating Issue assignees...');

  // 获取所有有assigneeIds的Issue (注意: schema已更新，这里访问不到assigneeIds)
  // 如果在旧schema下执行，可以访问assigneeIds
  // 如果在新schema下执行，assigneeIds已不存在，此脚本仅作为参考

  // 查询所有Issue
  const issues = await prisma.$queryRaw<
    Array<{ id: string; assigneeIds: string[] }>
  >`SELECT id, "assigneeIds" FROM issues WHERE "assigneeIds" IS NOT NULL AND array_length("assigneeIds", 1) > 0`;

  console.log(`Found ${issues.length} issues with assignees`);

  let migratedCount = 0;
  let errorCount = 0;

  // 使用事务批量迁移
  for (const issue of issues) {
    try {
      await prisma.$transaction(async (tx) => {
        // 为每个assigneeId创建IssueAssignee记录
        for (const userId of issue.assigneeIds) {
          await tx.issueAssignee.create({
            data: {
              issueId: issue.id,
              userId: userId,
            },
          });
        }
      });

      migratedCount++;
      if (migratedCount % 100 === 0) {
        console.log(`✅ Migrated ${migratedCount}/${issues.length} issues`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to migrate issue ${issue.id}:`, error.message);
    }
  }

  console.log(
    `✅ Issue assignees migration completed: ${migratedCount} success, ${errorCount} errors`,
  );
}

async function migratePRAssignees() {
  console.log('🔄 Migrating PR assignees...');

  // 查询所有PR的assigneeIds (同样的问题，新schema下可能访问不到)
  // 这里使用原始SQL查询
  const prs = await prisma.$queryRaw<
    Array<{ id: string; assigneeIds: string[] }>
  >`SELECT id, "assigneeIds" FROM pull_requests WHERE "assigneeIds" IS NOT NULL AND array_length("assigneeIds", 1) > 0`;

  console.log(`Found ${prs.length} pull requests with assignees`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const pr of prs) {
    try {
      await prisma.$transaction(async (tx) => {
        // 为每个assigneeId创建PRAssignee记录
        for (const userId of pr.assigneeIds) {
          await tx.pRAssignee.create({
            data: {
              pullRequestId: pr.id,
              userId: userId,
            },
          });
        }
      });

      migratedCount++;
      if (migratedCount % 100 === 0) {
        console.log(`✅ Migrated ${migratedCount}/${prs.length} PRs`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to migrate PR ${pr.id}:`, error.message);
    }
  }

  console.log(
    `✅ PR assignees migration completed: ${migratedCount} success, ${errorCount} errors`,
  );
}

async function main() {
  console.log('🚀 Starting assignees data migration...\n');

  try {
    await migrateIssueAssignees();
    console.log('');
    await migratePRAssignees();

    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify data integrity: Check assignees count matches old assigneeIds count');
    console.log('2. Deploy new code with updated API');
    console.log('3. Update frontend to use new assignees structure');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

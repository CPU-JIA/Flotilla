-- AlterTable: 添加原子计数器字段
ALTER TABLE "projects" ADD COLUMN "nextIssueNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "projects" ADD COLUMN "nextPRNumber" INTEGER NOT NULL DEFAULT 1;

-- 数据迁移: 为现有项目设置正确的初始值
-- 🔒 ECP-A1防御编程: 确保现有数据的编号连续性
UPDATE "projects" p
SET "nextIssueNumber" = COALESCE((
  SELECT MAX(i.number) + 1
  FROM "issues" i
  WHERE i."projectId" = p.id
), 1);

UPDATE "projects" p
SET "nextPRNumber" = COALESCE((
  SELECT MAX(pr.number) + 1
  FROM "pull_requests" pr
  WHERE pr."projectId" = p.id
), 1);

-- 🔒 REFACTOR: Issue 标签从数组字段迁移到关联表
-- ECP-A1: SOLID 原则 - 符合关系型数据库设计范式
-- ECP-C3: Performance Awareness - 优化查询性能，消除 N+1 查询风险

-- CreateTable: 创建 issue_labels 关联表
CREATE TABLE "issue_labels" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 防止重复标签
CREATE UNIQUE INDEX "issue_labels_issueId_labelId_key" ON "issue_labels"("issueId", "labelId");

-- CreateIndex: 查询标签的所有Issue（优化性能）
CREATE INDEX "issue_labels_labelId_idx" ON "issue_labels"("labelId");

-- CreateIndex: 查询Issue的所有标签（优化性能）
CREATE INDEX "issue_labels_issueId_idx" ON "issue_labels"("issueId");

-- AddForeignKey: Issue 外键约束（级联删除）
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Label 外键约束（级联删除）
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 数据迁移: 将现有 labelIds 数组数据迁移到关联表
-- 使用 unnest() 函数展开数组，并为每个标签创建一条记录
INSERT INTO "issue_labels" ("id", "issueId", "labelId", "createdAt")
SELECT
    gen_random_uuid()::text AS id,  -- 生成唯一 ID（使用 PostgreSQL 的 UUID 函数）
    i.id AS "issueId",
    unnest(i."labelIds") AS "labelId",
    i."createdAt" AS "createdAt"
FROM "issues" i
WHERE array_length(i."labelIds", 1) > 0;  -- 只处理有标签的 Issue

-- AlterTable: 删除 issues 表的 labelIds 列（数据已迁移完成）
ALTER TABLE "issues" DROP COLUMN "labelIds";

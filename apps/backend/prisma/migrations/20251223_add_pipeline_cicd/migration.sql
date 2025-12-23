-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILURE', 'CANCELLED');

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL,
    "triggers" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_runs" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "commitSha" VARCHAR(64) NOT NULL,
    "branch" VARCHAR(100) NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "logs" TEXT,
    "metadata" JSONB,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_projectId_name_key" ON "pipelines"("projectId", "name");

-- CreateIndex
CREATE INDEX "pipelines_projectId_idx" ON "pipelines"("projectId");

-- CreateIndex
CREATE INDEX "pipelines_active_idx" ON "pipelines"("active");

-- CreateIndex
CREATE INDEX "pipeline_runs_pipelineId_idx" ON "pipeline_runs"("pipelineId");

-- CreateIndex
CREATE INDEX "pipeline_runs_status_idx" ON "pipeline_runs"("status");

-- CreateIndex
CREATE INDEX "pipeline_runs_commitSha_idx" ON "pipeline_runs"("commitSha");

-- CreateIndex
CREATE INDEX "pipeline_runs_startedAt_idx" ON "pipeline_runs"("startedAt");

-- CreateIndex
CREATE INDEX "pipeline_runs_pipelineId_startedAt_idx" ON "pipeline_runs"("pipelineId", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

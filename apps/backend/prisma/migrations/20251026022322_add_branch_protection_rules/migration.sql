-- CreateTable
CREATE TABLE "branch_protection_rules" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "branchPattern" VARCHAR(100) NOT NULL,
    "requirePullRequest" BOOLEAN NOT NULL DEFAULT true,
    "requiredApprovingReviews" INTEGER NOT NULL DEFAULT 1,
    "dismissStaleReviews" BOOLEAN NOT NULL DEFAULT false,
    "requireCodeOwnerReview" BOOLEAN NOT NULL DEFAULT false,
    "allowForcePushes" BOOLEAN NOT NULL DEFAULT false,
    "allowDeletions" BOOLEAN NOT NULL DEFAULT false,
    "requireStatusChecks" BOOLEAN NOT NULL DEFAULT false,
    "requiredStatusChecks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_protection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_protection_rules_projectId_idx" ON "branch_protection_rules"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_protection_rules_projectId_branchPattern_key" ON "branch_protection_rules"("projectId", "branchPattern");

-- AddForeignKey
ALTER TABLE "branch_protection_rules" ADD CONSTRAINT "branch_protection_rules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

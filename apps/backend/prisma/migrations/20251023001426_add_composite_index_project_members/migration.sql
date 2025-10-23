-- CreateIndex
CREATE INDEX "project_members_projectId_userId_idx" ON "project_members"("projectId", "userId");

-- CreateTable
CREATE TABLE "wiki_pages" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_page_histories" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" VARCHAR(500),

    CONSTRAINT "wiki_page_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wiki_pages_projectId_idx" ON "wiki_pages"("projectId");

-- CreateIndex
CREATE INDEX "wiki_pages_parentId_idx" ON "wiki_pages"("parentId");

-- CreateIndex
CREATE INDEX "wiki_pages_projectId_parentId_order_idx" ON "wiki_pages"("projectId", "parentId", "order");

-- CreateIndex
CREATE INDEX "wiki_pages_createdById_idx" ON "wiki_pages"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "wiki_pages_projectId_slug_key" ON "wiki_pages"("projectId", "slug");

-- CreateIndex
CREATE INDEX "wiki_page_histories_pageId_idx" ON "wiki_page_histories"("pageId");

-- CreateIndex
CREATE INDEX "wiki_page_histories_pageId_editedAt_idx" ON "wiki_page_histories"("pageId", "editedAt" DESC);

-- CreateIndex
CREATE INDEX "wiki_page_histories_editedById_idx" ON "wiki_page_histories"("editedById");

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_page_histories" ADD CONSTRAINT "wiki_page_histories_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_page_histories" ADD CONSTRAINT "wiki_page_histories_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

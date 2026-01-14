-- CreateTable
CREATE TABLE "saved_search" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "sortBy" TEXT,
    "sortOrder" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_search_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "share_link" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL DEFAULT 'view',
    "expiresAt" TIMESTAMP(3),
    "maxViews" INTEGER,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_link_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "saved_search_teamId_userId_idx" ON "saved_search"("teamId", "userId");

-- CreateIndex
CREATE INDEX "saved_search_userId_isPinned_idx" ON "saved_search"("userId", "isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "saved_search_teamId_userId_name_key" ON "saved_search"("teamId", "userId", "name");

-- CreateIndex
CREATE INDEX "share_link_teamId_documentId_idx" ON "share_link"("teamId", "documentId");

-- CreateIndex
CREATE INDEX "share_link_userId_idx" ON "share_link"("userId");

-- CreateIndex
CREATE INDEX "share_link_expiresAt_idx" ON "share_link"("expiresAt");

-- CreateIndex
CREATE INDEX "share_link_isActive_idx" ON "share_link"("isActive");

-- AddForeignKey
ALTER TABLE "saved_search" ADD CONSTRAINT "saved_search_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

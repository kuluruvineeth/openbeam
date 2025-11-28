-- AlterTable
ALTER TABLE "connector_audit_log" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "changes" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "indexed_document" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "contentLength" INTEGER,
ADD COLUMN     "createdAtSource" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedFromSource" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "documentSubtype" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sourcePath" TEXT,
ADD COLUMN     "syncVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAtSource" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "connector_audit_log_userId_idx" ON "connector_audit_log"("userId");

-- CreateIndex
CREATE INDEX "connector_audit_log_action_idx" ON "connector_audit_log"("action");

-- CreateIndex
CREATE INDEX "indexed_document_parentId_idx" ON "indexed_document"("parentId");

-- CreateIndex
CREATE INDEX "indexed_document_deletedFromSource_idx" ON "indexed_document"("deletedFromSource");

-- AlterTable
ALTER TABLE "indexed_document" ADD COLUMN     "lastChecksum" TEXT;

-- AlterTable
ALTER TABLE "sync_job" ADD COLUMN     "fenceToken" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "rateLimitConfig" JSONB,
ADD COLUMN     "schedule" TEXT;

-- CreateIndex
CREATE INDEX "indexed_document_connectorId_checksum_idx" ON "indexed_document"("connectorId", "checksum");

-- CreateIndex
CREATE INDEX "indexed_document_lastSyncedAt_idx" ON "indexed_document"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "sync_job_nextRunAt_idx" ON "sync_job"("nextRunAt");

-- CreateIndex
CREATE INDEX "sync_job_priority_idx" ON "sync_job"("priority");

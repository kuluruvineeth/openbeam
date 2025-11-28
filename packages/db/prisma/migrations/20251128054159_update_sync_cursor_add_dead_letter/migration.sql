-- AlterTable
ALTER TABLE "sync_cursor" ADD COLUMN     "cursorType" TEXT NOT NULL DEFAULT 'timestamp',
ADD COLUMN     "lastDocumentId" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "resourceType" TEXT;

-- CreateTable
CREATE TABLE "sync_dead_letter" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "syncJobId" TEXT,
    "externalId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "rawData" JSONB,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorStack" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastRetryAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_dead_letter_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "sync_dead_letter_connectorId_idx" ON "sync_dead_letter"("connectorId");

-- CreateIndex
CREATE INDEX "sync_dead_letter_status_idx" ON "sync_dead_letter"("status");

-- CreateIndex
CREATE INDEX "sync_dead_letter_nextRetryAt_idx" ON "sync_dead_letter"("nextRetryAt");

-- CreateIndex
CREATE INDEX "sync_dead_letter_errorType_idx" ON "sync_dead_letter"("errorType");

-- CreateIndex
CREATE INDEX "sync_cursor_connectorId_idx" ON "sync_cursor"("connectorId");

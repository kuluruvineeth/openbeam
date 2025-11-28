-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "SyncEventType" AS ENUM ('JOB_STARTED', 'JOB_COMPLETED', 'JOB_FAILED', 'JOB_CANCELLED', 'JOB_TIMEOUT', 'PHASE_STARTED', 'PHASE_COMPLETED', 'RESOURCE_STARTED', 'RESOURCE_COMPLETED', 'RESOURCE_FAILED', 'DOCUMENT_INDEXED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_SKIPPED', 'DOCUMENT_FAILED', 'RATE_LIMITED', 'TOKEN_REFRESHED', 'CHECKPOINT_SAVED', 'CHECKPOINT_RESTORED', 'ERROR', 'WARNING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SyncCategory" ADD VALUE 'DELTA';
ALTER TYPE "SyncCategory" ADD VALUE 'REPAIR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SyncTrigger" ADD VALUE 'REALTIME';
ALTER TYPE "SyncTrigger" ADD VALUE 'BACKFILL';
ALTER TYPE "SyncTrigger" ADD VALUE 'RETRY';

-- CreateTable
CREATE TABLE "sync_event" (
    "_id" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "eventType" "SyncEventType" NOT NULL,
    "message" TEXT,
    "resource" TEXT,
    "documentId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_event_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "sync_event_syncJobId_idx" ON "sync_event"("syncJobId");

-- CreateIndex
CREATE INDEX "sync_event_eventType_idx" ON "sync_event"("eventType");

-- CreateIndex
CREATE INDEX "sync_event_createdAt_idx" ON "sync_event"("createdAt");

-- AddForeignKey
ALTER TABLE "sync_event" ADD CONSTRAINT "sync_event_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "sync_job"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - The `status` column on the `sync_job` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "sync_job" ADD COLUMN     "checkpoint" JSONB,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentPhase" TEXT,
ADD COLUMN     "currentResource" TEXT,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "errorStack" TEXT,
ADD COLUMN     "itemsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "itemsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobType" TEXT NOT NULL DEFAULT 'sync',
ADD COLUMN     "lastCheckpointAt" TIMESTAMP(3),
ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockId" TEXT,
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "queuedAt" TIMESTAMP(3),
ADD COLUMN     "rateLimitedUntil" TIMESTAMP(3),
ADD COLUMN     "retryAfter" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeoutMs" INTEGER NOT NULL DEFAULT 3600000,
DROP COLUMN "status",
ADD COLUMN     "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "sync_job_status_idx" ON "sync_job"("status");

-- CreateIndex
CREATE INDEX "sync_job_status_nextRunAt_idx" ON "sync_job"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "sync_job_connectorId_status_idx" ON "sync_job"("connectorId", "status");

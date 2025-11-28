/*
  Warnings:

  - A unique constraint covering the columns `[executionId]` on the table `sync_history` will be added. If there are existing duplicate values, this will fail.
  - The required column `executionId` was added to the `sync_history` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `trigger` to the `sync_history` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `sync_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "sync_history" ADD COLUMN     "apiCallsMade" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bytesProcessed" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "dataFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dataSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "errors" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "executionId" TEXT NOT NULL,
ADD COLUMN     "fetchTimeMs" INTEGER,
ADD COLUMN     "indexTimeMs" INTEGER,
ADD COLUMN     "processTimeMs" INTEGER,
ADD COLUMN     "rateLimitHits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resourcesSynced" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "trigger" "SyncTrigger" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SyncJobStatus" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sync_history_executionId_key" ON "sync_history"("executionId");

-- CreateIndex
CREATE INDEX "sync_history_status_idx" ON "sync_history"("status");

-- CreateIndex
CREATE INDEX "sync_history_connectorId_startedAt_idx" ON "sync_history"("connectorId", "startedAt");

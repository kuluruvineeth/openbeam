-- AlterTable
ALTER TABLE "mission" ADD COLUMN IF NOT EXISTS "cronSchedule" TEXT,
ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3),
ALTER COLUMN "heartbeatIntervalMin" SET DEFAULT 2;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mission_isRecurring_nextRunAt_idx" ON "mission"("isRecurring", "nextRunAt");

-- AlterTable
ALTER TABLE "mission_agent" ADD COLUMN IF NOT EXISTS "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "mission_task" ADD COLUMN IF NOT EXISTS "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "requiredCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

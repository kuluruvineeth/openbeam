-- AlterTable
ALTER TABLE "custom_connector_definition" ADD COLUMN "pullConfig" JSONB,
ADD COLUMN "pullEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pullScheduleCron" TEXT,
ADD COLUMN "lastPullSyncAt" TIMESTAMP(3);

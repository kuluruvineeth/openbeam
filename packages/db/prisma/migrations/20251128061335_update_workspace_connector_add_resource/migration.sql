-- AlterTable
ALTER TABLE "connector" ADD COLUMN     "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "errorBackoffUntil" TIMESTAMP(3),
ADD COLUMN     "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "lastHealthCheck" TIMESTAMP(3),
ADD COLUMN     "lastSyncDuration" INTEGER,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "rateLimitResetAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "statusMessage" TEXT,
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "syncMode" TEXT NOT NULL DEFAULT 'incremental',
ADD COLUMN     "totalDocuments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalEntities" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFiles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMessages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookSecret" TEXT,
ALTER COLUMN "config" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "domain" TEXT,
ADD COLUMN     "iconUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "connector_resource" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "name" TEXT,
    "path" TEXT,
    "parentId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncPriority" INTEGER NOT NULL DEFAULT 5,
    "lastSyncedAt" TIMESTAMP(3),
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "accessControl" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_resource_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "connector_resource_connectorId_idx" ON "connector_resource"("connectorId");

-- CreateIndex
CREATE INDEX "connector_resource_resourceType_idx" ON "connector_resource"("resourceType");

-- CreateIndex
CREATE INDEX "connector_resource_syncEnabled_idx" ON "connector_resource"("syncEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "connector_resource_connectorId_externalId_key" ON "connector_resource"("connectorId", "externalId");

-- CreateIndex
CREATE INDEX "connector_lastSyncedAt_idx" ON "connector"("lastSyncedAt");

-- AddForeignKey
ALTER TABLE "connector_resource" ADD CONSTRAINT "connector_resource_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

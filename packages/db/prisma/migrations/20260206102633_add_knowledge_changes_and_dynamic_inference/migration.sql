-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'PERMISSION_CHANGED');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('CONNECTOR_SYNC', 'AGENT_ACTION', 'USER_FEEDBACK', 'INFERENCE_PIPELINE');

-- AlterEnum
ALTER TYPE "RelationType" ADD VALUE 'WORKS_ON';

-- CreateTable
CREATE TABLE "document_change" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "source" "ChangeSource" NOT NULL DEFAULT 'CONNECTOR_SYNC',
    "changedBy" TEXT,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "eventTime" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_change_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "entity_change" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "source" "ChangeSource" NOT NULL,
    "triggeredBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_change_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "activity_event" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "user_interaction" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interaction_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "user_entity_affinity" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_entity_affinity_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "document_change_teamId_processedAt_idx" ON "document_change"("teamId", "processedAt");

-- CreateIndex
CREATE INDEX "document_change_teamId_connectorId_createdAt_idx" ON "document_change"("teamId", "connectorId", "createdAt");

-- CreateIndex
CREATE INDEX "document_change_documentId_idx" ON "document_change"("documentId");

-- CreateIndex
CREATE INDEX "entity_change_teamId_processedAt_idx" ON "entity_change"("teamId", "processedAt");

-- CreateIndex
CREATE INDEX "entity_change_entityId_idx" ON "entity_change"("entityId");

-- CreateIndex
CREATE INDEX "activity_event_teamId_userId_createdAt_idx" ON "activity_event"("teamId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_event_teamId_resourceType_createdAt_idx" ON "activity_event"("teamId", "resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "user_interaction_teamId_userId_createdAt_idx" ON "user_interaction"("teamId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_interaction_documentId_idx" ON "user_interaction"("documentId");

-- CreateIndex
CREATE INDEX "user_entity_affinity_teamId_userId_score_idx" ON "user_entity_affinity"("teamId", "userId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_entity_affinity_teamId_userId_entityId_key" ON "user_entity_affinity"("teamId", "userId", "entityId");

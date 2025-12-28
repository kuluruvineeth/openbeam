-- CreateEnum
CREATE TYPE "PermissionGranteeType" AS ENUM ('USER', 'GROUP', 'DOMAIN', 'ANYONE');

-- CreateEnum
CREATE TYPE "PermissionRole" AS ENUM ('READER', 'COMMENTER', 'WRITER', 'OWNER');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('TEAM', 'DEPARTMENT', 'ROLE', 'CHANNEL', 'DRIVE', 'WORKSPACE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PermissionSyncState" AS ENUM ('IDLE', 'SYNCING', 'FAILED', 'DISABLED');

-- CreateTable
CREATE TABLE "document_permission" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "granteeType" "PermissionGranteeType" NOT NULL,
    "granteeId" TEXT,
    "granteeDomain" TEXT,
    "role" "PermissionRole" NOT NULL DEFAULT 'READER',
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_permission_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "group_membership" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupType" "GroupType" NOT NULL,
    "source" TEXT NOT NULL,
    "externalGroupId" TEXT,
    "externalUserId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_membership_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "connector_scope" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFullAccess" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_scope_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "permission_sync_status" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "lastFullSync" TIMESTAMP(3),
    "lastIncrementalSync" TIMESTAMP(3),
    "syncCursor" TEXT,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalPermissions" INTEGER NOT NULL DEFAULT 0,
    "totalGroups" INTEGER NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PermissionSyncState" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_sync_status_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "document_permission_documentId_idx" ON "document_permission"("documentId");

-- CreateIndex
CREATE INDEX "document_permission_granteeType_granteeId_idx" ON "document_permission"("granteeType", "granteeId");

-- CreateIndex
CREATE INDEX "document_permission_granteeType_granteeDomain_idx" ON "document_permission"("granteeType", "granteeDomain");

-- CreateIndex
CREATE INDEX "document_permission_connectorId_syncedAt_idx" ON "document_permission"("connectorId", "syncedAt");

-- CreateIndex
CREATE INDEX "document_permission_teamId_granteeId_idx" ON "document_permission"("teamId", "granteeId");

-- CreateIndex
CREATE INDEX "document_permission_teamId_expiresAt_idx" ON "document_permission"("teamId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_permission_documentId_granteeType_granteeId_grante_key" ON "document_permission"("documentId", "granteeType", "granteeId", "granteeDomain");

-- CreateIndex
CREATE INDEX "group_membership_userId_idx" ON "group_membership"("userId");

-- CreateIndex
CREATE INDEX "group_membership_groupId_idx" ON "group_membership"("groupId");

-- CreateIndex
CREATE INDEX "group_membership_teamId_userId_idx" ON "group_membership"("teamId", "userId");

-- CreateIndex
CREATE INDEX "group_membership_source_syncedAt_idx" ON "group_membership"("source", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "group_membership_teamId_userId_groupId_source_key" ON "group_membership"("teamId", "userId", "groupId", "source");

-- CreateIndex
CREATE INDEX "connector_scope_teamId_userId_idx" ON "connector_scope"("teamId", "userId");

-- CreateIndex
CREATE INDEX "connector_scope_connectorId_idx" ON "connector_scope"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "connector_scope_connectorId_userId_key" ON "connector_scope"("connectorId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "permission_sync_status_connectorId_key" ON "permission_sync_status"("connectorId");

-- CreateIndex
CREATE INDEX "permission_sync_status_teamId_idx" ON "permission_sync_status"("teamId");

-- CreateIndex
CREATE INDEX "permission_sync_status_status_idx" ON "permission_sync_status"("status");

-- AddForeignKey
ALTER TABLE "document_permission" ADD CONSTRAINT "document_permission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_permission" ADD CONSTRAINT "document_permission_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_scope" ADD CONSTRAINT "connector_scope_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_scope" ADD CONSTRAINT "connector_scope_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_scope" ADD CONSTRAINT "connector_scope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_sync_status" ADD CONSTRAINT "permission_sync_status_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_sync_status" ADD CONSTRAINT "permission_sync_status_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

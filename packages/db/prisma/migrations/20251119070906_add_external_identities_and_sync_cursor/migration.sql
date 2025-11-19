-- CreateTable
CREATE TABLE "external_identity" (
    "_id" TEXT NOT NULL,
    "userId" TEXT,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_identity_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "external_group" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_group_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "sync_cursor" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_cursor_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "external_identity_userId_idx" ON "external_identity"("userId");

-- CreateIndex
CREATE INDEX "external_identity_email_idx" ON "external_identity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "external_identity_connectorId_externalId_key" ON "external_identity"("connectorId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "external_group_connectorId_externalId_key" ON "external_group"("connectorId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursor_connectorId_resource_key" ON "sync_cursor"("connectorId", "resource");

-- AddForeignKey
ALTER TABLE "external_identity" ADD CONSTRAINT "external_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identity" ADD CONSTRAINT "external_identity_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_group" ADD CONSTRAINT "external_group_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_cursor" ADD CONSTRAINT "sync_cursor_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

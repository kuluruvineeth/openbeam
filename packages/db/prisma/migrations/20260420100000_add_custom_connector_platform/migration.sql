-- CreateTable
CREATE TABLE "custom_connector_definition" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "fieldMappings" JSONB NOT NULL DEFAULT '{}',
    "defaultDocumentType" TEXT NOT NULL DEFAULT 'custom_document',
    "defaultIsPublic" BOOLEAN NOT NULL DEFAULT false,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalPushes" INTEGER NOT NULL DEFAULT 0,
    "lastPushAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_connector_definition_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "custom_connector_api_key" (
    "_id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['push', 'delete', 'status']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_connector_api_key_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_connector_definition_connectorId_key" ON "custom_connector_definition"("connectorId");

-- CreateIndex
CREATE INDEX "custom_connector_definition_teamId_idx" ON "custom_connector_definition"("teamId");

-- CreateIndex
CREATE INDEX "custom_connector_definition_slug_idx" ON "custom_connector_definition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_connector_definition_teamId_slug_key" ON "custom_connector_definition"("teamId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_connector_api_key_keyHash_key" ON "custom_connector_api_key"("keyHash");

-- CreateIndex
CREATE INDEX "custom_connector_api_key_definitionId_idx" ON "custom_connector_api_key"("definitionId");

-- CreateIndex
CREATE INDEX "custom_connector_api_key_keyHash_idx" ON "custom_connector_api_key"("keyHash");

-- CreateIndex
CREATE INDEX "custom_connector_api_key_prefix_idx" ON "custom_connector_api_key"("prefix");

-- AddForeignKey
ALTER TABLE "custom_connector_definition" ADD CONSTRAINT "custom_connector_definition_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_connector_definition" ADD CONSTRAINT "custom_connector_definition_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_connector_api_key" ADD CONSTRAINT "custom_connector_api_key_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_connector_definition"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

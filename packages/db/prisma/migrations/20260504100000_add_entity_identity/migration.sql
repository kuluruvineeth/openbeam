-- CreateTable
CREATE TABLE "entity_identity" (
    "_id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "connectorType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_identity_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entity_identity_teamId_connectorType_externalId_key" ON "entity_identity"("teamId", "connectorType", "externalId");

-- CreateIndex
CREATE INDEX "entity_identity_entityId_idx" ON "entity_identity"("entityId");

-- CreateIndex
CREATE INDEX "entity_identity_teamId_email_idx" ON "entity_identity"("teamId", "email");

-- AddForeignKey
ALTER TABLE "entity_identity" ADD CONSTRAINT "entity_identity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

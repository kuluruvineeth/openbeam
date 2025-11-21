-- CreateTable
CREATE TABLE "indexed_document" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "vespaId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sourceId" TEXT,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "checksum" TEXT,

    CONSTRAINT "indexed_document_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "indexed_document_vespaId_key" ON "indexed_document"("vespaId");

-- CreateIndex
CREATE INDEX "indexed_document_connectorId_documentType_idx" ON "indexed_document"("connectorId", "documentType");

-- CreateIndex
CREATE INDEX "indexed_document_vespaId_idx" ON "indexed_document"("vespaId");

-- CreateIndex
CREATE INDEX "indexed_document_sourceId_idx" ON "indexed_document"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_document_connectorId_externalId_key" ON "indexed_document"("connectorId", "externalId");

-- AddForeignKey
ALTER TABLE "indexed_document" ADD CONSTRAINT "indexed_document_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

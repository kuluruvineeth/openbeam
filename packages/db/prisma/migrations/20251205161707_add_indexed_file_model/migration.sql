-- CreateEnum
CREATE TYPE "FileProcessingStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'DOWNLOADED', 'PARSING', 'PARSED', 'INDEXING', 'INDEXED', 'FAILED');

-- CreateTable
CREATE TABLE "indexed_file" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "vespaId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceMessageId" TEXT,
    "sourceChannelId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileExtension" TEXT,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "processingStatus" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" BOOLEAN NOT NULL DEFAULT false,
    "textLength" INTEGER,
    "pageCount" INTEGER,
    "chunkCount" INTEGER,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexed_file_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "indexed_file_vespaId_key" ON "indexed_file"("vespaId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_file_storageKey_key" ON "indexed_file"("storageKey");

-- CreateIndex
CREATE INDEX "indexed_file_processingStatus_idx" ON "indexed_file"("processingStatus");

-- CreateIndex
CREATE INDEX "indexed_file_mimeType_idx" ON "indexed_file"("mimeType");

-- CreateIndex
CREATE INDEX "indexed_file_connectorId_idx" ON "indexed_file"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_file_connectorId_externalId_key" ON "indexed_file"("connectorId", "externalId");

-- AddForeignKey
ALTER TABLE "indexed_file" ADD CONSTRAINT "indexed_file_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

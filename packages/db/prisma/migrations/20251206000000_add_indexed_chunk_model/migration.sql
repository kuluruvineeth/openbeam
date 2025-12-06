-- CreateTable
CREATE TABLE "indexed_chunk" (
    "_id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "vespaId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "checksum" TEXT,
    "contentLength" INTEGER,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexed_chunk_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "indexed_chunk_vespaId_key" ON "indexed_chunk"("vespaId");

-- CreateIndex
CREATE INDEX "indexed_chunk_connectorId_idx" ON "indexed_chunk"("connectorId");

-- CreateIndex
CREATE INDEX "indexed_chunk_vespaId_idx" ON "indexed_chunk"("vespaId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_chunk_fileId_chunkIndex_key" ON "indexed_chunk"("fileId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "indexed_chunk" ADD CONSTRAINT "indexed_chunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "indexed_file"("_id") ON DELETE CASCADE ON UPDATE CASCADE;


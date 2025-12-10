-- CreateEnum
CREATE TYPE "VideoProcessingStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'DOWNLOADED', 'INDEXING_TWELVELABS', 'INDEXED_TWELVELABS', 'GENERATING_EMBEDDINGS', 'INDEXING_VESPA', 'INDEXED', 'FAILED');

-- CreateTable
CREATE TABLE "indexed_video" (
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
    "twelveLabsIndexId" TEXT,
    "twelveLabsVideoId" TEXT,
    "processingStatus" "VideoProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexed_video_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "team_video_index" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "twelveLabsIndexId" TEXT NOT NULL,
    "indexName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_video_index_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "indexed_video_vespaId_key" ON "indexed_video"("vespaId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_video_storageKey_key" ON "indexed_video"("storageKey");

-- CreateIndex
CREATE INDEX "indexed_video_processingStatus_idx" ON "indexed_video"("processingStatus");

-- CreateIndex
CREATE INDEX "indexed_video_connectorId_idx" ON "indexed_video"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_video_connectorId_externalId_key" ON "indexed_video"("connectorId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "team_video_index_teamId_key" ON "team_video_index"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "team_video_index_twelveLabsIndexId_key" ON "team_video_index"("twelveLabsIndexId");

-- AddForeignKey
ALTER TABLE "indexed_video" ADD CONSTRAINT "indexed_video_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_video_index" ADD CONSTRAINT "team_video_index_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

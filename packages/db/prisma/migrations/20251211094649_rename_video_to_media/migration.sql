/*
  Warnings:

  - You are about to drop the `indexed_video` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_video_index` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'DOWNLOADED', 'INDEXING_TWELVELABS', 'INDEXED_TWELVELABS', 'GENERATING_EMBEDDINGS', 'INDEXING_VESPA', 'INDEXED', 'FAILED');

-- DropForeignKey
ALTER TABLE "indexed_video" DROP CONSTRAINT "indexed_video_connectorId_fkey";

-- DropForeignKey
ALTER TABLE "team_video_index" DROP CONSTRAINT "team_video_index_teamId_fkey";

-- DropTable
DROP TABLE "indexed_video";

-- DropTable
DROP TABLE "team_video_index";

-- DropEnum
DROP TYPE "VideoProcessingStatus";

-- CreateTable
CREATE TABLE "indexed_media" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "vespaId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'video',
    "sourceMessageId" TEXT,
    "sourceChannelId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileExtension" TEXT,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "twelveLabsIndexId" TEXT,
    "twelveLabsAssetId" TEXT,
    "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "lastError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3),
    "indexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexed_media_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "team_media_index" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "twelveLabsIndexId" TEXT NOT NULL,
    "indexName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_media_index_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "indexed_media_vespaId_key" ON "indexed_media"("vespaId");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_media_storageKey_key" ON "indexed_media"("storageKey");

-- CreateIndex
CREATE INDEX "indexed_media_processingStatus_idx" ON "indexed_media"("processingStatus");

-- CreateIndex
CREATE INDEX "indexed_media_connectorId_idx" ON "indexed_media"("connectorId");

-- CreateIndex
CREATE INDEX "indexed_media_mediaType_idx" ON "indexed_media"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "indexed_media_connectorId_externalId_key" ON "indexed_media"("connectorId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "team_media_index_teamId_key" ON "team_media_index"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "team_media_index_twelveLabsIndexId_key" ON "team_media_index"("twelveLabsIndexId");

-- AddForeignKey
ALTER TABLE "indexed_media" ADD CONSTRAINT "indexed_media_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_media_index" ADD CONSTRAINT "team_media_index_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

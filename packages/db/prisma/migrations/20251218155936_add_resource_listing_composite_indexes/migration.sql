-- CreateIndex
CREATE INDEX "indexed_document_connectorId_sourceId_deletedFromSource_ind_idx" ON "indexed_document"("connectorId", "sourceId", "deletedFromSource", "indexedAt" DESC);

-- CreateIndex
CREATE INDEX "indexed_file_connectorId_sourceChannelId_processingStatus_i_idx" ON "indexed_file"("connectorId", "sourceChannelId", "processingStatus", "indexedAt" DESC);

-- CreateIndex
CREATE INDEX "indexed_media_connectorId_sourceChannelId_processingStatus__idx" ON "indexed_media"("connectorId", "sourceChannelId", "processingStatus", "indexedAt" DESC);

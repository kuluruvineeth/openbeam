-- CreateIndex
CREATE UNIQUE INDEX "entity_mention_entityId_documentId_mentionText_source_key" ON "entity_mention"("entityId", "documentId", "mentionText", "source");

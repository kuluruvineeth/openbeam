-- CreateTable
CREATE TABLE "team_knowledge" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdByMissionId" TEXT NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_knowledge_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "team_knowledge_mission_link" (
    "_id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_knowledge_mission_link_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "team_knowledge_teamId_category_confidence_idx" ON "team_knowledge"("teamId", "category", "confidence" DESC);

-- CreateIndex
CREATE INDEX "team_knowledge_teamId_lastAccessedAt_idx" ON "team_knowledge"("teamId", "lastAccessedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "team_knowledge_teamId_contentHash_key" ON "team_knowledge"("teamId", "contentHash");

-- CreateIndex
CREATE INDEX "team_knowledge_mission_link_missionId_idx" ON "team_knowledge_mission_link"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "team_knowledge_mission_link_knowledgeId_missionId_key" ON "team_knowledge_mission_link"("knowledgeId", "missionId");

-- AddForeignKey
ALTER TABLE "team_knowledge" ADD CONSTRAINT "team_knowledge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_knowledge_mission_link" ADD CONSTRAINT "team_knowledge_mission_link_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "team_knowledge"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

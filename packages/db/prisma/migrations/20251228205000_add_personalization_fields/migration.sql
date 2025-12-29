-- AlterTable: Add personalization fields to user_search_profile
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "queryEmbedding" BYTEA;
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "docEmbedding" BYTEA;
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "topicWeights" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "recentQueries" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "recentClicks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "embeddingVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "lastEmbeddingAt" TIMESTAMP(3);
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "user_search_profile" ADD COLUMN IF NOT EXISTS "personalizationEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_search_profile_lastActiveAt_idx" ON "user_search_profile"("lastActiveAt");

-- CreateTable: UserSessionActivity for analytics
CREATE TABLE IF NOT EXISTS "user_session_activity" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "totalDwellMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "topConnectors" JSONB NOT NULL DEFAULT '[]',
    "topTopics" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "user_session_activity_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_session_activity_sessionId_key" ON "user_session_activity"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_session_activity_userId_teamId_idx" ON "user_session_activity"("userId", "teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_session_activity_startedAt_idx" ON "user_session_activity"("startedAt");

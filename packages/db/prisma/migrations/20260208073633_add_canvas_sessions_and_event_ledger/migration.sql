-- DropIndex
DROP INDEX "entity_mention_entityId_documentId_mentionText_source_key";

-- AlterTable
ALTER TABLE "agent_canvas_execution" ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "turnId" TEXT;

-- CreateTable
CREATE TABLE "agent_canvas_session" (
    "_id" TEXT NOT NULL,
    "agentCanvasId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastEventSequence" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_canvas_session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_session_event" (
    "_id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentCanvasId" TEXT NOT NULL,
    "executionId" TEXT,
    "turnId" TEXT,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'visible',
    "payload" JSONB NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_canvas_session_event_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "agent_canvas_session_teamId_userId_agentCanvasId_status_idx" ON "agent_canvas_session"("teamId", "userId", "agentCanvasId", "status");

-- CreateIndex
CREATE INDEX "agent_canvas_session_agentCanvasId_updatedAt_idx" ON "agent_canvas_session"("agentCanvasId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "agent_canvas_session_agentCanvasId_teamId_userId_status_key" ON "agent_canvas_session"("agentCanvasId", "teamId", "userId", "status");

-- CreateIndex
CREATE INDEX "agent_canvas_session_event_sessionId_createdAt_idx" ON "agent_canvas_session_event"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_canvas_session_event_executionId_createdAt_idx" ON "agent_canvas_session_event"("executionId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_canvas_session_event_teamId_agentCanvasId_createdAt_idx" ON "agent_canvas_session_event"("teamId", "agentCanvasId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_canvas_session_event_sessionId_sequence_key" ON "agent_canvas_session_event"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_sessionId_createdAt_idx" ON "agent_canvas_execution"("sessionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "agent_canvas_execution" ADD CONSTRAINT "agent_canvas_execution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_canvas_session"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_session" ADD CONSTRAINT "agent_canvas_session_agentCanvasId_fkey" FOREIGN KEY ("agentCanvasId") REFERENCES "agent_canvas"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_session" ADD CONSTRAINT "agent_canvas_session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_session" ADD CONSTRAINT "agent_canvas_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_session_event" ADD CONSTRAINT "agent_canvas_session_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_canvas_session"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_session_event" ADD CONSTRAINT "agent_canvas_session_event_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_canvas_execution"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

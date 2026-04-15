-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('PENDING', 'PLANNING', 'INVESTIGATING', 'SYNTHESIZING', 'WRITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "research_session" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "ResearchStatus" NOT NULL DEFAULT 'PENDING',
    "report" TEXT,
    "plan" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "tokenUsage" JSONB,
    "workflowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "research_evidence" (
    "_id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "connector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_evidence_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_session_workflowId_key" ON "research_session"("workflowId");

-- CreateIndex
CREATE INDEX "research_session_teamId_createdAt_idx" ON "research_session"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "research_session_userId_createdAt_idx" ON "research_session"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "research_session_workflowId_idx" ON "research_session"("workflowId");

-- CreateIndex
CREATE INDEX "research_evidence_sessionId_idx" ON "research_evidence"("sessionId");

-- AddForeignKey
ALTER TABLE "research_session" ADD CONSTRAINT "research_session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_session" ADD CONSTRAINT "research_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_evidence" ADD CONSTRAINT "research_evidence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "research_session"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

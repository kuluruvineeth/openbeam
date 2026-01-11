-- CreateEnum
CREATE TYPE "EmergencePatternStatus" AS ENUM ('OBSERVED', 'VALIDATED', 'FORMALIZED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserFeedbackType" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'CORRECTION', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "composition_event" (
    "_id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSequence" TEXT[],
    "toolCount" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "userSatisfied" BOOLEAN,
    "feedbackId" TEXT,
    "promptCategory" TEXT,
    "entityTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "composition_event_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "emergence_pattern" (
    "_id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "toolSequence" TEXT[],
    "sequenceLength" INTEGER NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmergencePatternStatus" NOT NULL DEFAULT 'OBSERVED',
    "formalizedAs" TEXT,
    "rejectionReason" TEXT,
    "examples" JSONB NOT NULL DEFAULT '[]',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergence_pattern_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "user_feedback" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "traceId" TEXT,
    "compositionId" TEXT,
    "type" "UserFeedbackType" NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "correction" TEXT,
    "promptSummary" TEXT,
    "responseSummary" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_execution_trace" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" "AgentExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "completionSignal" TEXT,
    "inputPrompt" TEXT NOT NULL,
    "outputResult" JSONB,
    "toolCalls" JSONB NOT NULL DEFAULT '[]',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "parentTraceId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "agent_execution_trace_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "composition_event_signature_idx" ON "composition_event"("signature");

-- CreateIndex
CREATE INDEX "composition_event_teamId_timestamp_success_idx" ON "composition_event"("teamId", "timestamp", "success");

-- CreateIndex
CREATE INDEX "composition_event_sessionId_timestamp_idx" ON "composition_event"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "composition_event_userSatisfied_timestamp_idx" ON "composition_event"("userSatisfied", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "emergence_pattern_signature_key" ON "emergence_pattern"("signature");

-- CreateIndex
CREATE INDEX "emergence_pattern_status_frequency_idx" ON "emergence_pattern"("status", "frequency");

-- CreateIndex
CREATE INDEX "emergence_pattern_status_successRate_idx" ON "emergence_pattern"("status", "successRate");

-- CreateIndex
CREATE INDEX "emergence_pattern_lastSeen_idx" ON "emergence_pattern"("lastSeen");

-- CreateIndex
CREATE INDEX "emergence_pattern_sequenceLength_frequency_idx" ON "emergence_pattern"("sequenceLength", "frequency");

-- CreateIndex
CREATE INDEX "user_feedback_teamId_createdAt_idx" ON "user_feedback"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "user_feedback_userId_createdAt_idx" ON "user_feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_feedback_teamId_type_processed_idx" ON "user_feedback"("teamId", "type", "processed");

-- CreateIndex
CREATE INDEX "user_feedback_sessionId_createdAt_idx" ON "user_feedback"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_execution_trace_teamId_startedAt_idx" ON "agent_execution_trace"("teamId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_execution_trace_sessionId_startedAt_idx" ON "agent_execution_trace"("sessionId", "startedAt");

-- CreateIndex
CREATE INDEX "agent_execution_trace_agentName_status_idx" ON "agent_execution_trace"("agentName", "status");

-- CreateIndex
CREATE INDEX "agent_execution_trace_parentTraceId_idx" ON "agent_execution_trace"("parentTraceId");

-- AddForeignKey
ALTER TABLE "composition_event" ADD CONSTRAINT "composition_event_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_event" ADD CONSTRAINT "composition_event_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "user_feedback"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_trace" ADD CONSTRAINT "agent_execution_trace_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_trace" ADD CONSTRAINT "agent_execution_trace_parentTraceId_fkey" FOREIGN KEY ("parentTraceId") REFERENCES "agent_execution_trace"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

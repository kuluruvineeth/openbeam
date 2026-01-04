-- CreateEnum
CREATE TYPE "AIUsageGranularity" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "BackgroundAgentStatus" AS ENUM ('PENDING', 'INITIALIZING', 'RUNNING', 'PAUSED', 'AWAITING_INPUT', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "SandboxType" AS ENUM ('E2B', 'DOCKER', 'LOCAL');

-- CreateTable
CREATE TABLE "ai_usage_log" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "traceId" TEXT NOT NULL,
    "parentSpanId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCostUsd" DOUBLE PRECISION NOT NULL,
    "outputCostUsd" DOUBLE PRECISION NOT NULL,
    "cacheCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "firstTokenMs" INTEGER,
    "workflow" TEXT,
    "feature" TEXT,
    "operation" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "ai_usage_summary" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "granularity" "AIUsageGranularity" NOT NULL DEFAULT 'DAY',
    "totalRequests" INTEGER NOT NULL,
    "successfulRequests" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "totalInputTokens" BIGINT NOT NULL,
    "totalOutputTokens" BIGINT NOT NULL,
    "totalCacheTokens" BIGINT NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    "costByProvider" JSONB NOT NULL,
    "costByModel" JSONB NOT NULL,
    "costByWorkflow" JSONB NOT NULL DEFAULT '{}',
    "costByUser" JSONB NOT NULL DEFAULT '{}',
    "avgLatencyMs" DOUBLE PRECISION NOT NULL,
    "p50LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p99LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_summary_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "ai_cache_metrics" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "kvCacheHits" INTEGER NOT NULL DEFAULT 0,
    "kvCacheMisses" INTEGER NOT NULL DEFAULT 0,
    "kvCacheHitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toolCacheHits" INTEGER NOT NULL DEFAULT 0,
    "toolCacheMisses" INTEGER NOT NULL DEFAULT 0,
    "toolCacheHitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokensSaved" BIGINT NOT NULL DEFAULT 0,
    "costSavedUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cache_metrics_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "ai_tool_usage" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "p95LatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tool_usage_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "background_agent" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'researcher',
    "status" "BackgroundAgentStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "totalSteps" INTEGER,
    "sandboxType" "SandboxType" NOT NULL DEFAULT 'E2B',
    "sandboxId" TEXT,
    "sandboxUrl" TEXT,
    "repositoryUrl" TEXT,
    "baseBranch" TEXT,
    "workingBranch" TEXT,
    "worktreePath" TEXT,
    "output" TEXT,
    "artifacts" JSONB NOT NULL DEFAULT '[]',
    "pullRequestUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "timeoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_agent_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "background_agent_checkpoint" (
    "_id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "memorySnapshot" JSONB,
    "contextWindow" JSONB,
    "stepIndex" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_agent_checkpoint_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "background_agent_log" (
    "_id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_agent_log_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "summaryUpToMessageId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "conversation_message" (
    "_id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "contextDocIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "groundingScore" DOUBLE PRECISION,
    "confidence" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "firstTokenMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_message_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "rag_interaction" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "conversationId" TEXT,
    "query" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryIntent" TEXT,
    "retrievedDocs" INTEGER NOT NULL,
    "usedChunks" INTEGER NOT NULL,
    "avgChunkScore" DOUBLE PRECISION,
    "answerLength" INTEGER NOT NULL,
    "citationCount" INTEGER NOT NULL,
    "groundingScore" DOUBLE PRECISION,
    "confidence" TEXT,
    "retrievalMs" INTEGER NOT NULL,
    "chunkingMs" INTEGER NOT NULL,
    "generationMs" INTEGER NOT NULL,
    "groundingMs" INTEGER,
    "totalMs" INTEGER NOT NULL,
    "firstTokenMs" INTEGER,
    "feedbackType" TEXT,
    "feedbackNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_interaction_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_log_traceId_key" ON "ai_usage_log"("traceId");

-- CreateIndex
CREATE INDEX "ai_usage_log_teamId_createdAt_idx" ON "ai_usage_log"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_log_userId_createdAt_idx" ON "ai_usage_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_log_traceId_idx" ON "ai_usage_log"("traceId");

-- CreateIndex
CREATE INDEX "ai_usage_log_workflow_createdAt_idx" ON "ai_usage_log"("workflow", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_log_provider_model_createdAt_idx" ON "ai_usage_log"("provider", "model", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_summary_teamId_periodStart_idx" ON "ai_usage_summary"("teamId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_summary_teamId_periodStart_granularity_key" ON "ai_usage_summary"("teamId", "periodStart", "granularity");

-- CreateIndex
CREATE INDEX "ai_cache_metrics_teamId_periodStart_idx" ON "ai_cache_metrics"("teamId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_cache_metrics_teamId_periodStart_key" ON "ai_cache_metrics"("teamId", "periodStart");

-- CreateIndex
CREATE INDEX "ai_tool_usage_teamId_periodStart_idx" ON "ai_tool_usage"("teamId", "periodStart");

-- CreateIndex
CREATE INDEX "ai_tool_usage_toolName_periodStart_idx" ON "ai_tool_usage"("toolName", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_tool_usage_teamId_toolName_periodStart_key" ON "ai_tool_usage"("teamId", "toolName", "periodStart");

-- CreateIndex
CREATE INDEX "background_agent_teamId_status_idx" ON "background_agent"("teamId", "status");

-- CreateIndex
CREATE INDEX "background_agent_userId_status_idx" ON "background_agent"("userId", "status");

-- CreateIndex
CREATE INDEX "background_agent_status_timeoutAt_idx" ON "background_agent"("status", "timeoutAt");

-- CreateIndex
CREATE INDEX "background_agent_checkpoint_agentId_idx" ON "background_agent_checkpoint"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "background_agent_checkpoint_agentId_version_key" ON "background_agent_checkpoint"("agentId", "version");

-- CreateIndex
CREATE INDEX "background_agent_log_agentId_createdAt_idx" ON "background_agent_log"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "conversation_userId_teamId_idx" ON "conversation"("userId", "teamId");

-- CreateIndex
CREATE INDEX "conversation_teamId_status_idx" ON "conversation"("teamId", "status");

-- CreateIndex
CREATE INDEX "conversation_createdAt_idx" ON "conversation"("createdAt");

-- CreateIndex
CREATE INDEX "conversation_message_conversationId_idx" ON "conversation_message"("conversationId");

-- CreateIndex
CREATE INDEX "rag_interaction_userId_teamId_idx" ON "rag_interaction"("userId", "teamId");

-- CreateIndex
CREATE INDEX "rag_interaction_queryHash_idx" ON "rag_interaction"("queryHash");

-- CreateIndex
CREATE INDEX "rag_interaction_createdAt_idx" ON "rag_interaction"("createdAt");

-- AddForeignKey
ALTER TABLE "background_agent_checkpoint" ADD CONSTRAINT "background_agent_checkpoint_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "background_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_agent_log" ADD CONSTRAINT "background_agent_log_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "background_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_message" ADD CONSTRAINT "conversation_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

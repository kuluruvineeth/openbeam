-- CreateEnum
CREATE TYPE "ComputerAgentSource" AS ENUM ('CATALOG', 'GENERATED');

-- CreateEnum
CREATE TYPE "ComputerAgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "ComputerAgentMode" AS ENUM ('AUTONOMOUS', 'APPROVAL', 'REPORT_ONLY');

-- CreateEnum
CREATE TYPE "ComputerRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'WAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "ComputerTriggerType" AS ENUM ('SCHEDULE', 'MANUAL', 'WEBHOOK', 'API');

-- CreateEnum
CREATE TYPE "ComputerStepType" AS ENUM ('TOOL_CALL', 'AI_GENERATION', 'MEMORY_READ', 'MEMORY_WRITE', 'NOTIFICATION', 'PROPOSAL', 'CONNECTOR_CALL', 'CONTEXT');

-- CreateTable
CREATE TABLE "computer_agent" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "source" "ComputerAgentSource" NOT NULL,
    "code" TEXT NOT NULL,
    "codeHash" VARCHAR(64),
    "templateId" VARCHAR(255),
    "status" "ComputerAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" "ComputerAgentMode" NOT NULL DEFAULT 'APPROVAL',
    "scheduleCron" VARCHAR(255),
    "config" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "computer_agent_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "computer_run" (
    "_id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "ComputerRunStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" "ComputerTriggerType",
    "triggeredByUser" TEXT,
    "proposedActions" JSONB,
    "summary" TEXT,
    "error" TEXT,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "llmCallCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsage" JSONB,
    "workflowId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "computer_run_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "computer_run_step" (
    "_id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "ComputerStepType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "computer_run_step_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "computer_agent_memory" (
    "_id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "computer_agent_memory_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "computer_agent_teamId_slug_key" ON "computer_agent"("teamId", "slug");

-- CreateIndex
CREATE INDEX "computer_agent_teamId_status_idx" ON "computer_agent"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "computer_run_workflowId_key" ON "computer_run"("workflowId");

-- CreateIndex
CREATE INDEX "computer_run_agentId_status_idx" ON "computer_run"("agentId", "status");

-- CreateIndex
CREATE INDEX "computer_run_teamId_createdAt_idx" ON "computer_run"("teamId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "computer_run_step_runId_sequence_idx" ON "computer_run_step"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "computer_agent_memory_agentId_key_key" ON "computer_agent_memory"("agentId", "key");

-- CreateIndex
CREATE INDEX "computer_agent_memory_agentId_idx" ON "computer_agent_memory"("agentId");

-- CreateIndex
CREATE INDEX "computer_agent_memory_teamId_idx" ON "computer_agent_memory"("teamId");

-- AddForeignKey
ALTER TABLE "computer_agent" ADD CONSTRAINT "computer_agent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_agent" ADD CONSTRAINT "computer_agent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_run" ADD CONSTRAINT "computer_run_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "computer_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_run" ADD CONSTRAINT "computer_run_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_run_step" ADD CONSTRAINT "computer_run_step_runId_fkey" FOREIGN KEY ("runId") REFERENCES "computer_run"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_agent_memory" ADD CONSTRAINT "computer_agent_memory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "computer_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_agent_memory" ADD CONSTRAINT "computer_agent_memory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

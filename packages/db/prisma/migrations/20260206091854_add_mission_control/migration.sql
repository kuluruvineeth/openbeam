-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MissionTaskStatus" AS ENUM ('INBOX', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MissionTaskPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "MissionRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- AlterTable
ALTER TABLE "agent_canvas_execution" ALTER COLUMN "trace" SET DEFAULT '{}';

-- CreateTable
CREATE TABLE "mission" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "budgetCents" INTEGER,
    "consumedCents" INTEGER NOT NULL DEFAULT 0,
    "maxConcurrentRuns" INTEGER NOT NULL DEFAULT 3,
    "heartbeatIntervalMin" INTEGER NOT NULL DEFAULT 15,
    "workflowId" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_agent" (
    "_id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "soulPrompt" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'specialist',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mission_agent_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_task" (
    "_id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MissionTaskStatus" NOT NULL DEFAULT 'INBOX',
    "priority" "MissionTaskPriority" NOT NULL DEFAULT 'P2',
    "assigneeId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "requestId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_task_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_comment" (
    "_id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromAgentId" TEXT,
    "fromUserId" TEXT,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_comment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_run" (
    "_id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "taskId" TEXT,
    "agentId" TEXT NOT NULL,
    "status" "MissionRunStatus" NOT NULL DEFAULT 'QUEUED',
    "workflowId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "artifacts" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_run_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_activity" (
    "_id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_activity_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "mission_memory" (
    "_id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentId" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'mission',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_memory_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "workflow_audit_log" (
    "_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workflowId" TEXT NOT NULL,
    "runId" TEXT,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_audit_log_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "mission_teamId_status_updatedAt_idx" ON "mission"("teamId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "mission_agent_missionId_sortOrder_idx" ON "mission_agent"("missionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "mission_agent_missionId_agentId_key" ON "mission_agent"("missionId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "mission_task_requestId_key" ON "mission_task"("requestId");

-- CreateIndex
CREATE INDEX "mission_task_missionId_status_priority_idx" ON "mission_task"("missionId", "status", "priority");

-- CreateIndex
CREATE INDEX "mission_task_assigneeId_status_idx" ON "mission_task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "mission_comment_taskId_createdAt_idx" ON "mission_comment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "mission_run_missionId_status_idx" ON "mission_run"("missionId", "status");

-- CreateIndex
CREATE INDEX "mission_run_agentId_status_idx" ON "mission_run"("agentId", "status");

-- CreateIndex
CREATE INDEX "mission_activity_missionId_createdAt_idx" ON "mission_activity"("missionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mission_memory_missionId_scope_idx" ON "mission_memory"("missionId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "mission_memory_missionId_agentId_key_scope_key" ON "mission_memory"("missionId", "agentId", "key", "scope");

-- CreateIndex
CREATE INDEX "workflow_audit_log_teamId_timestamp_idx" ON "workflow_audit_log"("teamId", "timestamp");

-- CreateIndex
CREATE INDEX "workflow_audit_log_workflowId_idx" ON "workflow_audit_log"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_audit_log_teamId_action_timestamp_idx" ON "workflow_audit_log"("teamId", "action", "timestamp");

-- CreateIndex
CREATE INDEX "workflow_audit_log_createdAt_idx" ON "workflow_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "agent_canvas_approval_executionId_nodeId_status_idx" ON "agent_canvas_approval"("executionId", "nodeId", "status");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_agentCanvasId_status_idx" ON "agent_canvas_execution"("agentCanvasId", "status");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_agentCanvasId_createdAt_idx" ON "agent_canvas_execution"("agentCanvasId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "mission" ADD CONSTRAINT "mission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_agent" ADD CONSTRAINT "mission_agent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "mission"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_agent" ADD CONSTRAINT "mission_agent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "background_agent"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_task" ADD CONSTRAINT "mission_task_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "mission"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_task" ADD CONSTRAINT "mission_task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "mission_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_comment" ADD CONSTRAINT "mission_comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "mission_task"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_comment" ADD CONSTRAINT "mission_comment_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "mission_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_run" ADD CONSTRAINT "mission_run_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "mission"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_run" ADD CONSTRAINT "mission_run_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "mission_task"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_run" ADD CONSTRAINT "mission_run_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "mission_agent"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_activity" ADD CONSTRAINT "mission_activity_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "mission"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_memory" ADD CONSTRAINT "mission_memory_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "mission"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_audit_log" ADD CONSTRAINT "workflow_audit_log_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

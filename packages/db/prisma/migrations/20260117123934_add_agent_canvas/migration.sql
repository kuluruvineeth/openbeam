-- CreateEnum
CREATE TYPE "AgentCanvasStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentTriggerType" AS ENUM ('MANUAL', 'SCHEDULE', 'WEBHOOK', 'EVENT');

-- CreateEnum
CREATE TYPE "AgentCanvasExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'WAITING_INPUT', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "AgentCanvasApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "agent_canvas" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" "AgentCanvasStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "viewport" JSONB,
    "settings" JSONB,
    "permissions" JSONB,
    "triggerId" TEXT,
    "triggerType" "AgentTriggerType",
    "triggerConfig" JSONB,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "agent_canvas_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_version" (
    "_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "agentCanvasId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "viewport" JSONB,
    "settings" JSONB,
    "changelog" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_canvas_version_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_execution" (
    "_id" TEXT NOT NULL,
    "agentCanvasId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "AgentCanvasExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "currentNodeId" TEXT,
    "trace" JSONB NOT NULL,
    "tokenUsage" JSONB,
    "latencyMs" INTEGER,
    "triggeredById" TEXT NOT NULL,
    "triggerSource" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_canvas_execution_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_execution_step" (
    "_id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" "AgentCanvasExecutionStatus" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "tokenUsage" JSONB,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_canvas_execution_step_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_approval" (
    "_id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "AgentCanvasApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestMessage" TEXT,
    "responseMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "respondedById" TEXT,

    CONSTRAINT "agent_canvas_approval_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "agent_canvas_template" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "settings" JSONB,
    "requiredConnectors" TEXT[],
    "requiredTools" TEXT[],
    "variables" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_canvas_template_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "agent_canvas_teamId_idx" ON "agent_canvas"("teamId");

-- CreateIndex
CREATE INDEX "agent_canvas_createdById_idx" ON "agent_canvas"("createdById");

-- CreateIndex
CREATE INDEX "agent_canvas_status_idx" ON "agent_canvas"("status");

-- CreateIndex
CREATE INDEX "agent_canvas_version_agentCanvasId_idx" ON "agent_canvas_version"("agentCanvasId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_canvas_version_agentCanvasId_version_key" ON "agent_canvas_version"("agentCanvasId", "version");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_agentCanvasId_idx" ON "agent_canvas_execution"("agentCanvasId");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_status_idx" ON "agent_canvas_execution"("status");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_triggeredById_idx" ON "agent_canvas_execution"("triggeredById");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_step_executionId_idx" ON "agent_canvas_execution_step"("executionId");

-- CreateIndex
CREATE INDEX "agent_canvas_execution_step_nodeId_idx" ON "agent_canvas_execution_step"("nodeId");

-- CreateIndex
CREATE INDEX "agent_canvas_approval_executionId_idx" ON "agent_canvas_approval"("executionId");

-- CreateIndex
CREATE INDEX "agent_canvas_approval_status_idx" ON "agent_canvas_approval"("status");

-- CreateIndex
CREATE INDEX "agent_canvas_template_category_idx" ON "agent_canvas_template"("category");

-- CreateIndex
CREATE INDEX "agent_canvas_template_isPublic_idx" ON "agent_canvas_template"("isPublic");

-- CreateIndex
CREATE INDEX "agent_canvas_template_teamId_idx" ON "agent_canvas_template"("teamId");

-- AddForeignKey
ALTER TABLE "agent_canvas" ADD CONSTRAINT "agent_canvas_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas" ADD CONSTRAINT "agent_canvas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_version" ADD CONSTRAINT "agent_canvas_version_agentCanvasId_fkey" FOREIGN KEY ("agentCanvasId") REFERENCES "agent_canvas"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_execution" ADD CONSTRAINT "agent_canvas_execution_agentCanvasId_fkey" FOREIGN KEY ("agentCanvasId") REFERENCES "agent_canvas"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_execution" ADD CONSTRAINT "agent_canvas_execution_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "user"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_execution_step" ADD CONSTRAINT "agent_canvas_execution_step_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_canvas_execution"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_approval" ADD CONSTRAINT "agent_canvas_approval_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_canvas_execution"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_approval" ADD CONSTRAINT "agent_canvas_approval_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_template" ADD CONSTRAINT "agent_canvas_template_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_version" ADD CONSTRAINT "agent_canvas_version_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_canvas_template" ADD CONSTRAINT "agent_canvas_template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

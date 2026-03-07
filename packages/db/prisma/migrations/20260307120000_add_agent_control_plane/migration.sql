-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'IDLE', 'RUNNING', 'ERROR', 'PAUSED', 'PENDING_APPROVAL', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AgentAdapterType" AS ENUM ('PROCESS', 'HTTP', 'CLAUDE_LOCAL', 'CODEX_LOCAL', 'OPENCLAW');

-- CreateEnum
CREATE TYPE "ControlIssueStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ControlIssuePriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "GoalLevel" AS ENUM ('COMPANY', 'TEAM', 'AGENT', 'TASK');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ControlProjectStatus" AS ENUM ('BACKLOG', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('HIRE_AGENT', 'APPROVE_CEO_STRATEGY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WakeupSource" AS ENUM ('TIMER', 'ASSIGNMENT', 'ON_DEMAND', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "WakeupStatus" AS ENUM ('QUEUED', 'CLAIMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HeartbeatRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ControlMembershipRole" AS ENUM ('OWNER', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "ControlMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('USER', 'AGENT');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SecretProvider" AS ENUM ('LOCAL_ENCRYPTED', 'AWS_SECRETS_MANAGER', 'GCP_SECRET_MANAGER', 'VAULT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppType" ADD VALUE 'OMNIVERSE';
ALTER TYPE "AppType" ADD VALUE 'MATTERPORT';
ALTER TYPE "AppType" ADD VALUE 'VIAM';
ALTER TYPE "AppType" ADD VALUE 'FHIR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'CUSTOMER';
ALTER TYPE "EntityType" ADD VALUE 'PRODUCT';
ALTER TYPE "EntityType" ADD VALUE 'EVENT';
ALTER TYPE "EntityType" ADD VALUE 'TICKET';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RelationType" ADD VALUE 'ASSIGNED_TO';
ALTER TYPE "RelationType" ADD VALUE 'CUSTOMER_OF';
ALTER TYPE "RelationType" ADD VALUE 'MILESTONE_FOR';
ALTER TYPE "RelationType" ADD VALUE 'FILED_IN';

-- DropForeignKey
ALTER TABLE "team_knowledge_mission_link" DROP CONSTRAINT "team_knowledge_mission_link_knowledgeId_fkey";

-- AlterTable
ALTER TABLE "team" ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "budgetMonthlyCents" INTEGER,
ADD COLUMN     "consumedMonthlyCents" INTEGER,
ADD COLUMN     "issueCounter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "issuePrefix" TEXT,
ADD COLUMN     "requireBoardApprovalForNewAgents" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "team_knowledge" DROP COLUMN "createdByMissionId";

-- DropTable
DROP TABLE "team_knowledge_mission_link";

-- CreateTable
CREATE TABLE "control_agent" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT,
    "icon" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "reportsTo" TEXT,
    "capabilities" TEXT,
    "adapterType" "AgentAdapterType" NOT NULL DEFAULT 'PROCESS',
    "adapterConfig" JSONB NOT NULL DEFAULT '{}',
    "runtimeConfig" JSONB NOT NULL DEFAULT '{}',
    "budgetMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "spentMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "lastHeartbeatAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_agent_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_agent_api_key" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_agent_api_key_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_agent_config_revision" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdByAgentId" TEXT,
    "createdByUserId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'patch',
    "rolledBackFromRevisionId" TEXT,
    "changedKeys" JSONB NOT NULL DEFAULT '[]',
    "beforeConfig" JSONB NOT NULL,
    "afterConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_agent_config_revision_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_agent_runtime_state" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "adapterType" "AgentAdapterType" NOT NULL,
    "sessionId" TEXT,
    "stateJson" JSONB NOT NULL DEFAULT '{}',
    "lastRunId" TEXT,
    "lastRunStatus" TEXT,
    "totalInputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalOutputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalCachedInputTokens" BIGINT NOT NULL DEFAULT 0,
    "totalCostCents" BIGINT NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_agent_runtime_state_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_agent_task_session" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "adapterType" "AgentAdapterType" NOT NULL,
    "taskKey" TEXT NOT NULL,
    "sessionParamsJson" JSONB,
    "sessionDisplayId" TEXT,
    "lastRunId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_agent_task_session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_agent_wakeup_request" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "source" "WakeupSource" NOT NULL,
    "triggerDetail" TEXT,
    "reason" TEXT,
    "payload" JSONB,
    "status" "WakeupStatus" NOT NULL DEFAULT 'QUEUED',
    "coalescedCount" INTEGER NOT NULL DEFAULT 0,
    "requestedByActorType" "PrincipalType",
    "requestedByActorId" TEXT,
    "idempotencyKey" TEXT,
    "runId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_agent_wakeup_request_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_heartbeat_run" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "invocationSource" TEXT NOT NULL DEFAULT 'on_demand',
    "triggerDetail" TEXT,
    "status" "HeartbeatRunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "wakeupRequestId" TEXT,
    "exitCode" INTEGER,
    "signal" TEXT,
    "usageJson" JSONB,
    "resultJson" JSONB,
    "sessionIdBefore" TEXT,
    "sessionIdAfter" TEXT,
    "logStore" TEXT,
    "logRef" TEXT,
    "logBytes" BIGINT,
    "logSha256" TEXT,
    "logCompressed" BOOLEAN NOT NULL DEFAULT false,
    "stdoutExcerpt" TEXT,
    "stderrExcerpt" TEXT,
    "errorCode" TEXT,
    "externalRunId" TEXT,
    "contextSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_heartbeat_run_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_heartbeat_run_event" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "stream" TEXT,
    "level" TEXT,
    "color" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_heartbeat_run_event_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_asset" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "originalFilename" TEXT,
    "createdByAgentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_asset_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT,
    "goalId" TEXT,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ControlIssueStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "ControlIssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeAgentId" TEXT,
    "assigneeUserId" TEXT,
    "checkoutRunId" TEXT,
    "executionRunId" TEXT,
    "executionAgentNameKey" TEXT,
    "executionLockedAt" TIMESTAMP(3),
    "createdByAgentId" TEXT,
    "createdByUserId" TEXT,
    "issueNumber" INTEGER,
    "identifier" TEXT,
    "requestDepth" INTEGER NOT NULL DEFAULT 0,
    "billingCode" TEXT,
    "assigneeAdapterOverrides" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_issue_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue_comment" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorAgentId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_issue_comment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue_attachment" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "issueCommentId" TEXT,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_issue_attachment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue_label" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_issue_label_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue_label_assignment" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_issue_label_assignment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_project" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "goalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ControlProjectStatus" NOT NULL DEFAULT 'BACKLOG',
    "leadAgentId" TEXT,
    "targetDate" DATE,
    "color" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_project_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_project_workspace" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cwd" TEXT,
    "repoUrl" TEXT,
    "repoRef" TEXT,
    "metadata" JSONB,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_project_workspace_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_project_goal" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_project_goal_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_goal" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "GoalLevel" NOT NULL DEFAULT 'TASK',
    "status" "GoalStatus" NOT NULL DEFAULT 'PLANNED',
    "parentId" TEXT,
    "ownerAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_goal_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_approval" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "requestedByAgentId" TEXT,
    "requestedByUserId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "decisionNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_approval_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_approval_comment" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "authorAgentId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_approval_comment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_issue_approval" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_issue_approval_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_cost_event" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "issueId" TEXT,
    "projectId" TEXT,
    "goalId" TEXT,
    "billingCode" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_cost_event_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_activity_log" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'system',
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "agentId" TEXT,
    "runId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_activity_log_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_team_secret" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "SecretProvider" NOT NULL DEFAULT 'LOCAL_ENCRYPTED',
    "externalRef" TEXT,
    "latestVersion" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdByAgentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_team_secret_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_team_secret_version" (
    "_id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "material" JSONB NOT NULL,
    "valueSha256" TEXT NOT NULL,
    "createdByAgentId" TEXT,
    "createdByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_team_secret_version_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_company_membership" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" TEXT NOT NULL,
    "status" "ControlMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "membershipRole" "ControlMembershipRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_company_membership_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_access_grant" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "scope" JSONB,
    "grantedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_access_grant_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_invite" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT,
    "inviteType" "InviteType" NOT NULL DEFAULT 'USER',
    "tokenHash" TEXT NOT NULL,
    "allowedJoinTypes" TEXT NOT NULL DEFAULT 'both',
    "defaultsPayload" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_invite_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "control_join_request" (
    "_id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestIp" TEXT NOT NULL,
    "requestingUserId" TEXT,
    "requestEmailSnapshot" TEXT,
    "agentName" TEXT,
    "adapterType" "AgentAdapterType",
    "capabilities" TEXT,
    "agentDefaultsPayload" JSONB,
    "claimSecretHash" TEXT,
    "claimSecretExpiresAt" TIMESTAMP(3),
    "claimSecretConsumedAt" TIMESTAMP(3),
    "createdAgentId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_join_request_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "control_agent_teamId_status_idx" ON "control_agent"("teamId", "status");

-- CreateIndex
CREATE INDEX "control_agent_teamId_reportsTo_idx" ON "control_agent"("teamId", "reportsTo");

-- CreateIndex
CREATE INDEX "control_agent_api_key_keyHash_idx" ON "control_agent_api_key"("keyHash");

-- CreateIndex
CREATE INDEX "control_agent_api_key_teamId_agentId_idx" ON "control_agent_api_key"("teamId", "agentId");

-- CreateIndex
CREATE INDEX "control_agent_config_revision_teamId_agentId_createdAt_idx" ON "control_agent_config_revision"("teamId", "agentId", "createdAt");

-- CreateIndex
CREATE INDEX "control_agent_config_revision_agentId_createdAt_idx" ON "control_agent_config_revision"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "control_agent_runtime_state_teamId__id_idx" ON "control_agent_runtime_state"("teamId", "_id");

-- CreateIndex
CREATE INDEX "control_agent_runtime_state_teamId_updatedAt_idx" ON "control_agent_runtime_state"("teamId", "updatedAt");

-- CreateIndex
CREATE INDEX "control_agent_task_session_teamId_agentId_updatedAt_idx" ON "control_agent_task_session"("teamId", "agentId", "updatedAt");

-- CreateIndex
CREATE INDEX "control_agent_task_session_teamId_taskKey_updatedAt_idx" ON "control_agent_task_session"("teamId", "taskKey", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "control_agent_task_session_teamId_agentId_adapterType_taskK_key" ON "control_agent_task_session"("teamId", "agentId", "adapterType", "taskKey");

-- CreateIndex
CREATE INDEX "control_agent_wakeup_request_teamId_agentId_status_idx" ON "control_agent_wakeup_request"("teamId", "agentId", "status");

-- CreateIndex
CREATE INDEX "control_agent_wakeup_request_teamId_requestedAt_idx" ON "control_agent_wakeup_request"("teamId", "requestedAt");

-- CreateIndex
CREATE INDEX "control_agent_wakeup_request_agentId_requestedAt_idx" ON "control_agent_wakeup_request"("agentId", "requestedAt");

-- CreateIndex
CREATE INDEX "control_heartbeat_run_teamId_agentId_startedAt_idx" ON "control_heartbeat_run"("teamId", "agentId", "startedAt");

-- CreateIndex
CREATE INDEX "control_heartbeat_run_event_runId_seq_idx" ON "control_heartbeat_run_event"("runId", "seq");

-- CreateIndex
CREATE INDEX "control_heartbeat_run_event_teamId_runId_idx" ON "control_heartbeat_run_event"("teamId", "runId");

-- CreateIndex
CREATE INDEX "control_heartbeat_run_event_teamId_createdAt_idx" ON "control_heartbeat_run_event"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "control_asset_teamId_createdAt_idx" ON "control_asset"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "control_asset_teamId_provider_idx" ON "control_asset"("teamId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "control_asset_teamId_objectKey_key" ON "control_asset"("teamId", "objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "control_issue_identifier_key" ON "control_issue"("identifier");

-- CreateIndex
CREATE INDEX "control_issue_teamId_status_idx" ON "control_issue"("teamId", "status");

-- CreateIndex
CREATE INDEX "control_issue_teamId_assigneeAgentId_status_idx" ON "control_issue"("teamId", "assigneeAgentId", "status");

-- CreateIndex
CREATE INDEX "control_issue_teamId_assigneeUserId_status_idx" ON "control_issue"("teamId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "control_issue_teamId_parentId_idx" ON "control_issue"("teamId", "parentId");

-- CreateIndex
CREATE INDEX "control_issue_teamId_projectId_idx" ON "control_issue"("teamId", "projectId");

-- CreateIndex
CREATE INDEX "control_issue_comment_issueId_idx" ON "control_issue_comment"("issueId");

-- CreateIndex
CREATE INDEX "control_issue_comment_teamId_idx" ON "control_issue_comment"("teamId");

-- CreateIndex
CREATE INDEX "control_issue_attachment_teamId_issueId_idx" ON "control_issue_attachment"("teamId", "issueId");

-- CreateIndex
CREATE INDEX "control_issue_attachment_issueCommentId_idx" ON "control_issue_attachment"("issueCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "control_issue_attachment_assetId_key" ON "control_issue_attachment"("assetId");

-- CreateIndex
CREATE INDEX "control_issue_label_teamId_idx" ON "control_issue_label"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "control_issue_label_teamId_name_key" ON "control_issue_label"("teamId", "name");

-- CreateIndex
CREATE INDEX "control_issue_label_assignment_issueId_idx" ON "control_issue_label_assignment"("issueId");

-- CreateIndex
CREATE INDEX "control_issue_label_assignment_labelId_idx" ON "control_issue_label_assignment"("labelId");

-- CreateIndex
CREATE INDEX "control_issue_label_assignment_teamId_idx" ON "control_issue_label_assignment"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "control_issue_label_assignment_issueId_labelId_key" ON "control_issue_label_assignment"("issueId", "labelId");

-- CreateIndex
CREATE INDEX "control_project_teamId_idx" ON "control_project"("teamId");

-- CreateIndex
CREATE INDEX "control_project_workspace_teamId_projectId_idx" ON "control_project_workspace"("teamId", "projectId");

-- CreateIndex
CREATE INDEX "control_project_workspace_projectId_isPrimary_idx" ON "control_project_workspace"("projectId", "isPrimary");

-- CreateIndex
CREATE INDEX "control_project_goal_projectId_idx" ON "control_project_goal"("projectId");

-- CreateIndex
CREATE INDEX "control_project_goal_goalId_idx" ON "control_project_goal"("goalId");

-- CreateIndex
CREATE INDEX "control_project_goal_teamId_idx" ON "control_project_goal"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "control_project_goal_projectId_goalId_key" ON "control_project_goal"("projectId", "goalId");

-- CreateIndex
CREATE INDEX "control_goal_teamId_idx" ON "control_goal"("teamId");

-- CreateIndex
CREATE INDEX "control_approval_teamId_status_type_idx" ON "control_approval"("teamId", "status", "type");

-- CreateIndex
CREATE INDEX "control_approval_comment_teamId_idx" ON "control_approval_comment"("teamId");

-- CreateIndex
CREATE INDEX "control_approval_comment_approvalId_idx" ON "control_approval_comment"("approvalId");

-- CreateIndex
CREATE INDEX "control_approval_comment_approvalId_createdAt_idx" ON "control_approval_comment"("approvalId", "createdAt");

-- CreateIndex
CREATE INDEX "control_issue_approval_issueId_idx" ON "control_issue_approval"("issueId");

-- CreateIndex
CREATE INDEX "control_issue_approval_approvalId_idx" ON "control_issue_approval"("approvalId");

-- CreateIndex
CREATE INDEX "control_issue_approval_teamId_idx" ON "control_issue_approval"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "control_issue_approval_issueId_approvalId_key" ON "control_issue_approval"("issueId", "approvalId");

-- CreateIndex
CREATE INDEX "control_cost_event_teamId_occurredAt_idx" ON "control_cost_event"("teamId", "occurredAt");

-- CreateIndex
CREATE INDEX "control_cost_event_teamId_agentId_occurredAt_idx" ON "control_cost_event"("teamId", "agentId", "occurredAt");

-- CreateIndex
CREATE INDEX "control_activity_log_teamId_createdAt_idx" ON "control_activity_log"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "control_activity_log_runId_idx" ON "control_activity_log"("runId");

-- CreateIndex
CREATE INDEX "control_activity_log_entityType_entityId_idx" ON "control_activity_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "control_team_secret_teamId_idx" ON "control_team_secret"("teamId");

-- CreateIndex
CREATE INDEX "control_team_secret_teamId_provider_idx" ON "control_team_secret"("teamId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "control_team_secret_teamId_name_key" ON "control_team_secret"("teamId", "name");

-- CreateIndex
CREATE INDEX "control_team_secret_version_secretId_createdAt_idx" ON "control_team_secret_version"("secretId", "createdAt");

-- CreateIndex
CREATE INDEX "control_team_secret_version_valueSha256_idx" ON "control_team_secret_version"("valueSha256");

-- CreateIndex
CREATE UNIQUE INDEX "control_team_secret_version_secretId_version_key" ON "control_team_secret_version"("secretId", "version");

-- CreateIndex
CREATE INDEX "control_company_membership_principalType_principalId_status_idx" ON "control_company_membership"("principalType", "principalId", "status");

-- CreateIndex
CREATE INDEX "control_company_membership_teamId_status_idx" ON "control_company_membership"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "control_company_membership_teamId_principalType_principalId_key" ON "control_company_membership"("teamId", "principalType", "principalId");

-- CreateIndex
CREATE INDEX "control_access_grant_teamId_permissionKey_idx" ON "control_access_grant"("teamId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "control_access_grant_teamId_principalType_principalId_permi_key" ON "control_access_grant"("teamId", "principalType", "principalId", "permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "control_invite_tokenHash_key" ON "control_invite"("tokenHash");

-- CreateIndex
CREATE INDEX "control_invite_teamId_inviteType_revokedAt_expiresAt_idx" ON "control_invite"("teamId", "inviteType", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "control_join_request_inviteId_key" ON "control_join_request"("inviteId");

-- CreateIndex
CREATE INDEX "control_join_request_teamId_status_requestType_createdAt_idx" ON "control_join_request"("teamId", "status", "requestType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_issuePrefix_key" ON "team"("issuePrefix");

-- AddForeignKey
ALTER TABLE "control_agent" ADD CONSTRAINT "control_agent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent" ADD CONSTRAINT "control_agent_reportsTo_fkey" FOREIGN KEY ("reportsTo") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_api_key" ADD CONSTRAINT "control_agent_api_key_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_api_key" ADD CONSTRAINT "control_agent_api_key_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_config_revision" ADD CONSTRAINT "control_agent_config_revision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_config_revision" ADD CONSTRAINT "control_agent_config_revision_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_config_revision" ADD CONSTRAINT "control_agent_config_revision_createdByAgentId_fkey" FOREIGN KEY ("createdByAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_runtime_state" ADD CONSTRAINT "control_agent_runtime_state_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_runtime_state" ADD CONSTRAINT "control_agent_runtime_state__id_fkey" FOREIGN KEY ("_id") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_task_session" ADD CONSTRAINT "control_agent_task_session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_task_session" ADD CONSTRAINT "control_agent_task_session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_wakeup_request" ADD CONSTRAINT "control_agent_wakeup_request_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_agent_wakeup_request" ADD CONSTRAINT "control_agent_wakeup_request_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run" ADD CONSTRAINT "control_heartbeat_run_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run" ADD CONSTRAINT "control_heartbeat_run_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run" ADD CONSTRAINT "control_heartbeat_run_wakeupRequestId_fkey" FOREIGN KEY ("wakeupRequestId") REFERENCES "control_agent_wakeup_request"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run_event" ADD CONSTRAINT "control_heartbeat_run_event_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run_event" ADD CONSTRAINT "control_heartbeat_run_event_runId_fkey" FOREIGN KEY ("runId") REFERENCES "control_heartbeat_run"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_heartbeat_run_event" ADD CONSTRAINT "control_heartbeat_run_event_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_asset" ADD CONSTRAINT "control_asset_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_asset" ADD CONSTRAINT "control_asset_createdByAgentId_fkey" FOREIGN KEY ("createdByAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "control_project"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "control_goal"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "control_issue"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_assigneeAgentId_fkey" FOREIGN KEY ("assigneeAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_createdByAgentId_fkey" FOREIGN KEY ("createdByAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_checkoutRunId_fkey" FOREIGN KEY ("checkoutRunId") REFERENCES "control_heartbeat_run"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue" ADD CONSTRAINT "control_issue_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "control_heartbeat_run"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_comment" ADD CONSTRAINT "control_issue_comment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_comment" ADD CONSTRAINT "control_issue_comment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "control_issue"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_comment" ADD CONSTRAINT "control_issue_comment_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_attachment" ADD CONSTRAINT "control_issue_attachment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_attachment" ADD CONSTRAINT "control_issue_attachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "control_issue"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_attachment" ADD CONSTRAINT "control_issue_attachment_issueCommentId_fkey" FOREIGN KEY ("issueCommentId") REFERENCES "control_issue_comment"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_attachment" ADD CONSTRAINT "control_issue_attachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "control_asset"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_label" ADD CONSTRAINT "control_issue_label_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_label_assignment" ADD CONSTRAINT "control_issue_label_assignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_label_assignment" ADD CONSTRAINT "control_issue_label_assignment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "control_issue"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_label_assignment" ADD CONSTRAINT "control_issue_label_assignment_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "control_issue_label"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project" ADD CONSTRAINT "control_project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project" ADD CONSTRAINT "control_project_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "control_goal"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project" ADD CONSTRAINT "control_project_leadAgentId_fkey" FOREIGN KEY ("leadAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project_workspace" ADD CONSTRAINT "control_project_workspace_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project_workspace" ADD CONSTRAINT "control_project_workspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "control_project"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project_goal" ADD CONSTRAINT "control_project_goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project_goal" ADD CONSTRAINT "control_project_goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "control_project"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_project_goal" ADD CONSTRAINT "control_project_goal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "control_goal"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_goal" ADD CONSTRAINT "control_goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_goal" ADD CONSTRAINT "control_goal_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "control_goal"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_goal" ADD CONSTRAINT "control_goal_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_approval" ADD CONSTRAINT "control_approval_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_approval" ADD CONSTRAINT "control_approval_requestedByAgentId_fkey" FOREIGN KEY ("requestedByAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_approval_comment" ADD CONSTRAINT "control_approval_comment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_approval_comment" ADD CONSTRAINT "control_approval_comment_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "control_approval"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_approval_comment" ADD CONSTRAINT "control_approval_comment_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_approval" ADD CONSTRAINT "control_issue_approval_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_approval" ADD CONSTRAINT "control_issue_approval_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "control_issue"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_issue_approval" ADD CONSTRAINT "control_issue_approval_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "control_approval"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_cost_event" ADD CONSTRAINT "control_cost_event_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_cost_event" ADD CONSTRAINT "control_cost_event_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_activity_log" ADD CONSTRAINT "control_activity_log_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_activity_log" ADD CONSTRAINT "control_activity_log_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_activity_log" ADD CONSTRAINT "control_activity_log_runId_fkey" FOREIGN KEY ("runId") REFERENCES "control_heartbeat_run"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_team_secret" ADD CONSTRAINT "control_team_secret_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_team_secret" ADD CONSTRAINT "control_team_secret_createdByAgentId_fkey" FOREIGN KEY ("createdByAgentId") REFERENCES "control_agent"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_team_secret_version" ADD CONSTRAINT "control_team_secret_version_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "control_team_secret"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_company_membership" ADD CONSTRAINT "control_company_membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_access_grant" ADD CONSTRAINT "control_access_grant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_invite" ADD CONSTRAINT "control_invite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_join_request" ADD CONSTRAINT "control_join_request_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_join_request" ADD CONSTRAINT "control_join_request_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "control_invite"("_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('SOURCE', 'DESTINATION');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('OAUTH2', 'API_KEY', 'BASIC', 'SESSION');

-- CreateEnum
CREATE TYPE "AppType" AS ENUM ('SLACK', 'GOOGLE_DRIVE', 'NOTION', 'GITHUB', 'HUBSPOT', 'SALESFORCE', 'ZENDESK', 'INTERCOM', 'JIRA', 'ASANA', 'TRELLO', 'AIRTABLE', 'CLICKUP', 'LINEAR', 'SHOPIFY', 'STRIPE', 'XERO', 'QUICKBOOKS', 'SAGE', 'NETSUITE', 'ZOHO', 'MICROSOFT_TEAMS', 'DISCORD', 'WHATSAPP', 'TWILIO', 'SENDGRID', 'MAILCHIMP', 'HUBSPOT_MARKETING', 'SALESFORCE_MARKETING', 'MARKETO', 'PARDOT', 'ELASTICSEARCH', 'MONGODB', 'POSTGRESQL', 'MYSQL', 'SQLSERVER', 'ORACLE', 'SNOWFLAKE', 'BIGQUERY', 'REDSHIFT', 'DATABRICKS', 'S3', 'GCS', 'AZURE_BLOB', 'BOX', 'DROPBOX', 'ONEDRIVE', 'SHAREPOINT', 'SERVICENOW', 'ZENDESK_SUPPORT', 'JIRA_SERVICE_MANAGEMENT', 'FRESHDESK', 'INTERCOM_SUPPORT', 'SALESFORCE_SERVICE_CLOUD');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'SYNCING', 'CONNECTING');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SyncCategory" AS ENUM ('FULL', 'INCREMENTAL');

-- AlterTable
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "invitation" ALTER COLUMN "role" TYPE "MemberRole" USING upper("role")::"MemberRole";
ALTER TABLE "invitation" ALTER COLUMN "status" TYPE "InvitationStatus" USING (
  CASE lower("status")
    WHEN 'rejected' THEN 'DECLINED'::"InvitationStatus"
    WHEN 'canceled' THEN 'EXPIRED'::"InvitationStatus"
    ELSE upper("status")::"InvitationStatus"
  END
);

-- AlterTable
ALTER TABLE "member" ALTER COLUMN "role" TYPE "MemberRole" USING upper("role")::"MemberRole";
ALTER TABLE "member" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "maxConnectors" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxTools" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "activeTeamId",
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "verification" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "workspace" (
    "_id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "connector" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceExternalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConnectorType" NOT NULL,
    "authType" "AuthType" NOT NULL,
    "app" "AppType" NOT NULL,
    "config" JSONB NOT NULL,
    "encryptedCredentials" TEXT,
    "credentialsIv" TEXT,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'CONNECTING',
    "state" JSONB NOT NULL DEFAULT '{}',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "syncConfig" JSONB NOT NULL DEFAULT '{}',
    "webhookConfig" JSONB,
    "rateLimits" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "dataResidency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "oauth_provider" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "oauthScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "app" "AppType" NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_provider_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "tool" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "externalId" TEXT,
    "toolName" TEXT NOT NULL,
    "toolSchema" JSONB NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "rateLimitPerHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "sync_job" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "type" "SyncCategory" NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'SYNCING',
    "trigger" "SyncTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastRanAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sync_job_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "sync_history" (
    "_id" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL,
    "errorMessage" TEXT,
    "dataAdded" INTEGER NOT NULL DEFAULT 0,
    "dataUpdated" INTEGER NOT NULL DEFAULT 0,
    "dataDeleted" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "connector_audit_log" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_audit_log_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_externalId_key" ON "workspace"("externalId");

-- CreateIndex
CREATE INDEX "workspace_organizationId_idx" ON "workspace"("organizationId");

-- CreateIndex
CREATE INDEX "connector_organizationId_status_idx" ON "connector"("organizationId", "status");

-- CreateIndex
CREATE INDEX "connector_userId_idx" ON "connector"("userId");

-- CreateIndex
CREATE INDEX "connector_app_idx" ON "connector"("app");

-- CreateIndex
CREATE INDEX "connector_status_idx" ON "connector"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connector_organizationId_workspaceExternalId_app_name_key" ON "connector"("organizationId", "workspaceExternalId", "app", "name");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_connectorId_key" ON "oauth_provider"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_externalId_key" ON "tool"("externalId");

-- CreateIndex
CREATE INDEX "tool_connectorId_idx" ON "tool"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "tool_organizationId_connectorId_toolName_key" ON "tool"("organizationId", "connectorId", "toolName");

-- CreateIndex
CREATE INDEX "sync_job_connectorId_idx" ON "sync_job"("connectorId");

-- CreateIndex
CREATE INDEX "sync_job_status_idx" ON "sync_job"("status");

-- CreateIndex
CREATE INDEX "sync_history_syncJobId_idx" ON "sync_history"("syncJobId");

-- CreateIndex
CREATE INDEX "sync_history_connectorId_idx" ON "sync_history"("connectorId");

-- CreateIndex
CREATE INDEX "sync_history_startedAt_idx" ON "sync_history"("startedAt");

-- CreateIndex
CREATE INDEX "connector_audit_log_connectorId_idx" ON "connector_audit_log"("connectorId");

-- CreateIndex
CREATE INDEX "connector_audit_log_createdAt_idx" ON "connector_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector" ADD CONSTRAINT "connector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector" ADD CONSTRAINT "connector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_provider" ADD CONSTRAINT "oauth_provider_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool" ADD CONSTRAINT "tool_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool" ADD CONSTRAINT "tool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_job" ADD CONSTRAINT "sync_job_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "sync_job"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_audit_log" ADD CONSTRAINT "connector_audit_log_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

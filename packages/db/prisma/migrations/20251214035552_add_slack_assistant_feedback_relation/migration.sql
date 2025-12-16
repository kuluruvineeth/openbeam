-- AlterTable
ALTER TABLE "connector" ADD COLUMN     "childWorkspaces" JSONB,
ADD COLUMN     "enterpriseId" TEXT,
ADD COLUMN     "isEnterpriseInstall" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "slack_channel_config" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "responseMode" TEXT NOT NULL DEFAULT 'confident',
    "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "respondToWorkflows" BOOLEAN NOT NULL DEFAULT false,
    "configuredBy" TEXT,
    "configuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_channel_config_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "slack_digest_subscription" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "channelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliveryTime" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveredAt" TIMESTAMP(3),
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_digest_subscription_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "slack_assistant_feedback" (
    "_id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageTs" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "citations" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_assistant_feedback_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "slack_channel_config_connectorId_idx" ON "slack_channel_config"("connectorId");

-- CreateIndex
CREATE UNIQUE INDEX "slack_channel_config_connectorId_channelId_key" ON "slack_channel_config"("connectorId", "channelId");

-- CreateIndex
CREATE INDEX "slack_digest_subscription_connectorId_idx" ON "slack_digest_subscription"("connectorId");

-- CreateIndex
CREATE INDEX "slack_digest_subscription_enabled_deliveryTime_idx" ON "slack_digest_subscription"("enabled", "deliveryTime");

-- CreateIndex
CREATE UNIQUE INDEX "slack_digest_subscription_connectorId_slackUserId_key" ON "slack_digest_subscription"("connectorId", "slackUserId");

-- CreateIndex
CREATE INDEX "slack_assistant_feedback_connectorId_idx" ON "slack_assistant_feedback"("connectorId");

-- CreateIndex
CREATE INDEX "slack_assistant_feedback_feedbackType_idx" ON "slack_assistant_feedback"("feedbackType");

-- CreateIndex
CREATE INDEX "slack_assistant_feedback_createdAt_idx" ON "slack_assistant_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "slack_channel_config" ADD CONSTRAINT "slack_channel_config_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_digest_subscription" ADD CONSTRAINT "slack_digest_subscription_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_assistant_feedback" ADD CONSTRAINT "slack_assistant_feedback_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

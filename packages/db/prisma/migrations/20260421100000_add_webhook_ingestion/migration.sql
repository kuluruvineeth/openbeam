-- AlterTable
ALTER TABLE "custom_connector_definition" ADD COLUMN "webhookConfig" JSONB,
ADD COLUMN "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "webhookSigningSecret" TEXT,
ADD COLUMN "webhookSigningSecretIv" TEXT,
ADD COLUMN "totalWebhookEvents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastWebhookReceivedAt" TIMESTAMP(3),
ADD COLUMN "consecutiveErrors" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "webhook_event" (
    "_id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "statusMessage" TEXT,
    "documentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawPayloadHash" TEXT,
    "payloadSize" INTEGER,
    "processingMs" INTEGER,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_definitionId_eventId_key" ON "webhook_event"("definitionId", "eventId");

-- CreateIndex
CREATE INDEX "webhook_event_definitionId_receivedAt_idx" ON "webhook_event"("definitionId", "receivedAt");

-- CreateIndex
CREATE INDEX "webhook_event_status_idx" ON "webhook_event"("status");

-- CreateIndex
CREATE INDEX "webhook_event_receivedAt_idx" ON "webhook_event"("receivedAt");

-- AddForeignKey
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_connector_definition"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

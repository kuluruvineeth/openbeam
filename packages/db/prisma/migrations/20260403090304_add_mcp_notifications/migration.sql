-- CreateTable
CREATE TABLE "mcp_notification" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "connectorId" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_notification_preference" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcp_notification_teamId_createdAt_idx" ON "mcp_notification"("teamId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mcp_notification_teamId_read_createdAt_idx" ON "mcp_notification"("teamId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mcp_notification_teamId_type_createdAt_idx" ON "mcp_notification"("teamId", "type", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_notification_preference_teamId_userId_channel_key" ON "mcp_notification_preference"("teamId", "userId", "channel");

-- AddForeignKey
ALTER TABLE "mcp_notification" ADD CONSTRAINT "mcp_notification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_notification" ADD CONSTRAINT "mcp_notification_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connector"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_notification_preference" ADD CONSTRAINT "mcp_notification_preference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

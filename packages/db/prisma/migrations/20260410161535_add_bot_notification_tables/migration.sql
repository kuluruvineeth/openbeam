-- CreateTable
CREATE TABLE IF NOT EXISTS "bot_notification_preference" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "connector_id" TEXT,
    "event_type" TEXT,
    "platform" "BotPlatform" NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" INTEGER,
    "quiet_hours_end" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_notification_preference_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bot_notification_event" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB NOT NULL,
    "connector_id" TEXT,
    "platform" "BotPlatform",
    "delivered_at" TIMESTAMP(3),
    "digested_at" TIMESTAMP(3),
    "suppressed_at" TIMESTAMP(3),
    "suppress_reason" TEXT,
    "dedup_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_notification_event_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bot_notification_preference_team_id_user_id_platform_connecto_key" ON "bot_notification_preference"("team_id", "user_id", "platform", "connector_id", "event_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bot_notification_preference_team_id_user_id_idx" ON "bot_notification_preference"("team_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bot_notification_event_team_id_user_id_delivered_at_idx" ON "bot_notification_event"("team_id", "user_id", "delivered_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bot_notification_event_team_id_user_id_event_type_created_at_idx" ON "bot_notification_event"("team_id", "user_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bot_notification_event_team_id_dedup_key_created_at_idx" ON "bot_notification_event"("team_id", "dedup_key", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "bot_notification_preference" ADD CONSTRAINT "bot_notification_preference_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_notification_event" ADD CONSTRAINT "bot_notification_event_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

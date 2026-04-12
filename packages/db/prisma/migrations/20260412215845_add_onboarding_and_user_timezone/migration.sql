-- AlterTable: Add timezone and locale to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE IF NOT EXISTS "bot_user_onboarding" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "BotPlatform" NOT NULL,
    "query_count" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'TOURIST',
    "first_query_at" TIMESTAMP(3),
    "last_query_at" TIMESTAMP(3),
    "discovered_caps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_streak_date" TIMESTAMP(3),
    "resolved_count" INTEGER NOT NULL DEFAULT 0,
    "unresolved_count" INTEGER NOT NULL DEFAULT 0,
    "milestone_first_action" TIMESTAMP(3),
    "milestone_fifty_queries" TIMESTAMP(3),
    "milestone_first_digest" TIMESTAMP(3),
    "milestone_week_streak" TIMESTAMP(3),
    "milestone_month_streak" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_user_onboarding_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bot_user_onboarding_team_id_user_id_platform_key" ON "bot_user_onboarding"("team_id", "user_id", "platform");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bot_user_onboarding_team_id_idx" ON "bot_user_onboarding"("team_id");

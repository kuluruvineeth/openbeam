-- CreateTable
CREATE TABLE "bot_user_link" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "platform_team_id" TEXT NOT NULL,
    "platform_username" TEXT,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_user_link_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "bot_installation" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_team_id" TEXT NOT NULL,
    "platform_team_name" TEXT,
    "installed_by" TEXT NOT NULL,
    "bot_token" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "webhook_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_installation_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "bot_link_request" (
    "_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "platform_team_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "team_id" TEXT,
    "user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_link_request_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_user_link_platform_platform_user_id_platform_team_id_key" ON "bot_user_link"("platform", "platform_user_id", "platform_team_id");

-- CreateIndex
CREATE INDEX "bot_user_link_team_id_idx" ON "bot_user_link"("team_id");

-- CreateIndex
CREATE INDEX "bot_user_link_user_id_idx" ON "bot_user_link"("user_id");

-- CreateIndex
CREATE INDEX "bot_user_link_platform_platform_team_id_idx" ON "bot_user_link"("platform", "platform_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "bot_installation_platform_platform_team_id_key" ON "bot_installation"("platform", "platform_team_id");

-- CreateIndex
CREATE INDEX "bot_installation_team_id_idx" ON "bot_installation"("team_id");

-- CreateIndex
CREATE INDEX "bot_installation_platform_active_idx" ON "bot_installation"("platform", "active");

-- CreateIndex
CREATE UNIQUE INDEX "bot_link_request_token_key" ON "bot_link_request"("token");

-- CreateIndex
CREATE INDEX "bot_link_request_token_idx" ON "bot_link_request"("token");

-- CreateIndex
CREATE INDEX "bot_link_request_expires_at_idx" ON "bot_link_request"("expires_at");

-- AddForeignKey
ALTER TABLE "bot_user_link" ADD CONSTRAINT "bot_user_link_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_user_link" ADD CONSTRAINT "bot_user_link_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_installation" ADD CONSTRAINT "bot_installation_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

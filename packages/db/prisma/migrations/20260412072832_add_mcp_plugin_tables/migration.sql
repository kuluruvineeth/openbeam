-- CreateEnum
CREATE TYPE "McpPluginAuthType" AS ENUM ('NONE', 'BEARER_TOKEN', 'OAUTH2');

-- CreateEnum
CREATE TYPE "McpPluginStatus" AS ENUM ('PENDING', 'HEALTHY', 'UNHEALTHY', 'DISABLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_plugin_server" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "installed_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "auth_type" "McpPluginAuthType" NOT NULL DEFAULT 'NONE',
    "auth_token_encrypted" TEXT,
    "auth_token_iv" TEXT,
    "auth_token_prefix" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tools_cache" JSONB,
    "tools_cached_at" TIMESTAMP(3),
    "status" "McpPluginStatus" NOT NULL DEFAULT 'PENDING',
    "last_health_at" TIMESTAMP(3),
    "last_health_error" TEXT,
    "health_fail_count" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_plugin_server_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_plugin_token" (
    "_id" TEXT NOT NULL,
    "plugin_server_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "access_token_iv" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT,
    "refresh_token_iv" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_plugin_token_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_plugin_server_team_id_slug_key" ON "mcp_plugin_server"("team_id", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mcp_plugin_server_team_id_enabled_idx" ON "mcp_plugin_server"("team_id", "enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mcp_plugin_server_status_enabled_idx" ON "mcp_plugin_server"("status", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_plugin_token_plugin_server_id_user_id_key" ON "mcp_plugin_token"("plugin_server_id", "user_id");

-- AddForeignKey
ALTER TABLE "mcp_plugin_server" ADD CONSTRAINT "mcp_plugin_server_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_plugin_token" ADD CONSTRAINT "mcp_plugin_token_plugin_server_id_fkey" FOREIGN KEY ("plugin_server_id") REFERENCES "mcp_plugin_server"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

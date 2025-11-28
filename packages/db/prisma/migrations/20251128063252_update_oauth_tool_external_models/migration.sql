-- AlterTable
ALTER TABLE "external_group" ADD COLUMN     "description" TEXT,
ADD COLUMN     "groupType" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "external_identity" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "externalRole" TEXT,
ADD COLUMN     "groupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawData" JSONB;

-- AlterTable
ALTER TABLE "oauth_provider" ADD COLUMN     "accessTokenIv" TEXT,
ADD COLUMN     "clientSecretIv" TEXT,
ADD COLUMN     "lastRefreshAttempt" TIMESTAMP(3),
ADD COLUMN     "refreshError" TEXT,
ADD COLUMN     "refreshFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refreshTokenIv" TEXT,
ADD COLUMN     "tokenScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tokenType" TEXT;

-- AlterTable
ALTER TABLE "tool" ADD COLUMN     "avgLatencyMs" DOUBLE PRECISION,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "deprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deprecatedAt" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "outputSchema" JSONB,
ADD COLUMN     "rateLimitPerMinute" INTEGER,
ADD COLUMN     "requiredPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "external_group_groupType_idx" ON "external_group"("groupType");

-- CreateIndex
CREATE INDEX "external_identity_connectorId_idx" ON "external_identity"("connectorId");

-- CreateIndex
CREATE INDEX "tool_teamId_idx" ON "tool"("teamId");

-- CreateIndex
CREATE INDEX "tool_category_idx" ON "tool"("category");

-- CreateIndex
CREATE INDEX "tool_enabled_idx" ON "tool"("enabled");

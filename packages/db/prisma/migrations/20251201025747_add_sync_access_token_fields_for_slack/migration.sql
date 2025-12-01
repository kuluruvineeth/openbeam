-- AlterTable
ALTER TABLE "oauth_provider" ADD COLUMN     "syncAccessToken" TEXT,
ADD COLUMN     "syncAccessTokenIv" TEXT,
ADD COLUMN     "syncAuthedUserId" TEXT,
ADD COLUMN     "syncTokenScopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "external_group_connectorId_idx" ON "external_group"("connectorId");

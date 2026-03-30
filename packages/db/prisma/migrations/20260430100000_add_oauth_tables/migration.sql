-- CreateTable
CREATE TABLE "oauth_application" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "overview" TEXT,
    "developerName" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "installUrl" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redirectUris" TEXT[],
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teamId" TEXT,
    "createdBy" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_application_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "oauth_authorization_code" (
    "_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "scopes" TEXT[],
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_code_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "oauth_access_token" (
    "_id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_access_token_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_application_slug_key" ON "oauth_application"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_application_clientId_key" ON "oauth_application"("clientId");

-- CreateIndex
CREATE INDEX "oauth_application_teamId_idx" ON "oauth_application"("teamId");

-- CreateIndex
CREATE INDEX "oauth_application_clientId_idx" ON "oauth_application"("clientId");

-- CreateIndex
CREATE INDEX "oauth_application_slug_idx" ON "oauth_application"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_code_code_key" ON "oauth_authorization_code"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_code_code_idx" ON "oauth_authorization_code"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_code_applicationId_idx" ON "oauth_authorization_code"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_access_token_tokenHash_key" ON "oauth_access_token"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_access_token_refreshTokenHash_key" ON "oauth_access_token"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "oauth_access_token_tokenHash_idx" ON "oauth_access_token"("tokenHash");

-- CreateIndex
CREATE INDEX "oauth_access_token_refreshTokenHash_idx" ON "oauth_access_token"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "oauth_access_token_applicationId_idx" ON "oauth_access_token"("applicationId");

-- AddForeignKey
ALTER TABLE "oauth_application" ADD CONSTRAINT "oauth_application_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorization_code" ADD CONSTRAINT "oauth_authorization_code_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "oauth_application"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "oauth_application"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

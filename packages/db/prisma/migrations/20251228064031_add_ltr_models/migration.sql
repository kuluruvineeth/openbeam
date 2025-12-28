-- CreateTable
CREATE TABLE "user_search_profile" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "department" TEXT,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "avgDwellMs" DOUBLE PRECISION,
    "connectorWeights" JSONB NOT NULL DEFAULT '{}',
    "authorInteractions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_search_profile_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "ltr_model" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'training',
    "storagePath" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "featureImportance" JSONB NOT NULL DEFAULT '{}',
    "trainingSamples" INTEGER NOT NULL DEFAULT 0,
    "trainingQueries" INTEGER NOT NULL DEFAULT 0,
    "trainingDurationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployedAt" TIMESTAMP(3),

    CONSTRAINT "ltr_model_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "user_search_profile_teamId_idx" ON "user_search_profile"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "user_search_profile_userId_teamId_key" ON "user_search_profile"("userId", "teamId");

-- CreateIndex
CREATE INDEX "ltr_model_teamId_status_idx" ON "ltr_model"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ltr_model_teamId_version_key" ON "ltr_model"("teamId", "version");

-- AlterEnum
ALTER TYPE "SyncCategory" ADD VALUE 'PERMISSIONS';

-- CreateTable
CREATE TABLE "search_experiment" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "trafficPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "controlConfig" JSONB NOT NULL DEFAULT '{}',
    "treatmentConfig" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_experiment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "search_impression" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experimentId" TEXT,
    "variant" TEXT,
    "query" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "resultDocIds" TEXT[],
    "timing" JSONB,
    "rrfConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_impression_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "search_click" (
    "_id" TEXT NOT NULL,
    "impressionId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dwellTimeMs" INTEGER,
    "feedbackType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_click_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "search_experiment_teamId_status_idx" ON "search_experiment"("teamId", "status");

-- CreateIndex
CREATE INDEX "search_impression_teamId_createdAt_idx" ON "search_impression"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "search_impression_experimentId_createdAt_idx" ON "search_impression"("experimentId", "createdAt");

-- CreateIndex
CREATE INDEX "search_click_impressionId_idx" ON "search_click"("impressionId");

-- CreateIndex
CREATE INDEX "search_click_docId_createdAt_idx" ON "search_click"("docId", "createdAt");

-- AddForeignKey
ALTER TABLE "search_experiment" ADD CONSTRAINT "search_experiment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_click" ADD CONSTRAINT "search_click_impressionId_fkey" FOREIGN KEY ("impressionId") REFERENCES "search_impression"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

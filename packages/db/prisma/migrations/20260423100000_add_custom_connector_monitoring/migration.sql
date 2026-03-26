-- CreateTable
CREATE TABLE "custom_connector_sync_run" (
    "_id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "errorMessage" TEXT,
    "documentsProcessed" INTEGER NOT NULL DEFAULT 0,
    "documentsFailed" INTEGER NOT NULL DEFAULT 0,
    "documentsDeleted" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "custom_connector_sync_run_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "custom_connector_metrics" (
    "_id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalSyncs" INTEGER NOT NULL DEFAULT 0,
    "successfulSyncs" INTEGER NOT NULL DEFAULT 0,
    "failedSyncs" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_connector_metrics_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "custom_connector_health_snapshot" (
    "_id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "avgLatencyMs" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_connector_health_snapshot_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "custom_connector_sync_run_definitionId_startedAt_idx" ON "custom_connector_sync_run"("definitionId", "startedAt");

-- CreateIndex
CREATE INDEX "custom_connector_sync_run_status_idx" ON "custom_connector_sync_run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_connector_metrics_definitionId_periodStart_key" ON "custom_connector_metrics"("definitionId", "periodStart");

-- CreateIndex
CREATE INDEX "custom_connector_metrics_definitionId_periodStart_idx" ON "custom_connector_metrics"("definitionId", "periodStart");

-- CreateIndex
CREATE INDEX "custom_connector_health_snapshot_definitionId_capturedAt_idx" ON "custom_connector_health_snapshot"("definitionId", "capturedAt");

-- AddForeignKey
ALTER TABLE "custom_connector_sync_run" ADD CONSTRAINT "custom_connector_sync_run_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_connector_definition"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_connector_metrics" ADD CONSTRAINT "custom_connector_metrics_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_connector_definition"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_connector_health_snapshot" ADD CONSTRAINT "custom_connector_health_snapshot_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_connector_definition"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

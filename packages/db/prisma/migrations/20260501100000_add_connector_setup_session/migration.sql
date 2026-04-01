-- CreateEnum
CREATE TYPE "ConnectorSetupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "connector_setup_session" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appType" "AppType" NOT NULL,
    "status" "ConnectorSetupStatus" NOT NULL DEFAULT 'PENDING',
    "connectorId" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connector_setup_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connector_setup_session_teamId_status_idx" ON "connector_setup_session"("teamId", "status");

-- CreateIndex
CREATE INDEX "connector_setup_session_status_expiresAt_idx" ON "connector_setup_session"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "connector_setup_session" ADD CONSTRAINT "connector_setup_session_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

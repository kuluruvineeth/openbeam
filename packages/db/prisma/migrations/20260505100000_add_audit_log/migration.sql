-- CreateTable
CREATE TABLE "audit_log" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "audit_log_teamId_createdAt_idx" ON "audit_log"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_teamId_category_createdAt_idx" ON "audit_log"("teamId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_teamId_userId_createdAt_idx" ON "audit_log"("teamId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

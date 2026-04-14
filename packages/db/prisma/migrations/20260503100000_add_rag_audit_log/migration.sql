-- CreateTable
CREATE TABLE "rag_audit_log" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "sourcesUsed" TEXT[],
    "sourcesFiltered" TEXT[],
    "filterReasons" JSONB,
    "answerLength" INTEGER NOT NULL,
    "citationCount" INTEGER NOT NULL,
    "permissionSetHash" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_audit_log_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "rag_audit_log_teamId_createdAt_idx" ON "rag_audit_log"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "rag_audit_log_userId_createdAt_idx" ON "rag_audit_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "rag_audit_log_queryHash_idx" ON "rag_audit_log"("queryHash");

-- AddForeignKey
ALTER TABLE "rag_audit_log" ADD CONSTRAINT "rag_audit_log_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_audit_log" ADD CONSTRAINT "rag_audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_canvas_execution" ADD COLUMN "workflowId" TEXT;
ALTER TABLE "agent_canvas_execution" ADD COLUMN "runId" TEXT;
ALTER TABLE "agent_canvas_execution" ADD COLUMN "temporalStatus" TEXT;
ALTER TABLE "agent_canvas_execution" ADD COLUMN "historyEventCount" INTEGER;
ALTER TABLE "agent_canvas_execution" ADD COLUMN "historySizeBytes" INTEGER;
ALTER TABLE "agent_canvas_execution" ADD COLUMN "continueAsNewCount" INTEGER;

CREATE TABLE "agent_canvas_execution_data" (
    "_id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT,
    "contentType" TEXT,
    "payload" JSONB NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_canvas_execution_data_pkey" PRIMARY KEY ("_id")
);

CREATE INDEX "agent_canvas_execution_workflowId_idx" ON "agent_canvas_execution"("workflowId");
CREATE INDEX "agent_canvas_execution_data_executionId_idx" ON "agent_canvas_execution_data"("executionId");
CREATE INDEX "agent_canvas_execution_data_nodeId_idx" ON "agent_canvas_execution_data"("nodeId");

ALTER TABLE "agent_canvas_execution_data" ADD CONSTRAINT "agent_canvas_execution_data_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_canvas_execution"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

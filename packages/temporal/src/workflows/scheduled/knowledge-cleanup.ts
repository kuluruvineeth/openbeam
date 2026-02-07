import { proxyActivities } from "@temporalio/workflow";
import type { KnowledgeCleanupActivities } from "../../activities/knowledge/types";

const cleanupActivities = proxyActivities<KnowledgeCleanupActivities>({
  startToCloseTimeout: "10 minutes",
  scheduleToCloseTimeout: "30 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "10s",
    backoffCoefficient: 2,
  },
});

export interface KnowledgeCleanupWorkflowInput {
  documentChangeRetentionDays?: number;
  entityChangeRetentionDays?: number;
  activityEventRetentionDays?: number;
}

export interface KnowledgeCleanupWorkflowOutput {
  documentChangesDeleted: number;
  entityChangesDeleted: number;
  activityEventsDeleted: number;
}

export function knowledgeCleanupWorkflow(
  input: KnowledgeCleanupWorkflowInput = {}
): Promise<KnowledgeCleanupWorkflowOutput> {
  return cleanupActivities.cleanupKnowledgeChanges({
    documentChangeRetentionDays: input.documentChangeRetentionDays,
    entityChangeRetentionDays: input.entityChangeRetentionDays,
    activityEventRetentionDays: input.activityEventRetentionDays,
  });
}

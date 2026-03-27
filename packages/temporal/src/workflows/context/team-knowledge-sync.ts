import { TeamKnowledgeSyncInputSchema } from "@openbeam/types/temporal/workflows/context";
import { continueAsNew, workflowInfo } from "@temporalio/workflow";

const HISTORY_LIMIT = 500;

export async function teamKnowledgeSyncWorkflow(
  rawInput: unknown
): Promise<void> {
  const input = TeamKnowledgeSyncInputSchema.parse(rawInput);

  if (workflowInfo().historyLength > HISTORY_LIMIT) {
    await continueAsNew<typeof teamKnowledgeSyncWorkflow>(input);
  }
}

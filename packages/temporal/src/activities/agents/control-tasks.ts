import type { Database } from "@openbeam/db";
import type { CheckoutIssueInput, ReleaseIssueInput } from "./control-types";

export interface ControlTaskDependencies {
  db: Database;
}

export function createControlTaskActivities(deps: ControlTaskDependencies) {
  return {
    async checkoutIssue(input: CheckoutIssueInput): Promise<void> {
      const { checkoutControlIssueForTeam } = await import(
        "@openbeam/services/control/issues"
      );
      await checkoutControlIssueForTeam(deps.db, {
        teamId: input.teamId,
        issueId: input.issueId,
        runId: input.runId,
        agentNameKey: input.agentNameKey,
        expectedStatuses: input.expectedStatuses,
      });
    },

    async releaseIssue(input: ReleaseIssueInput): Promise<void> {
      const { releaseControlIssueForTeam } = await import(
        "@openbeam/services/control/issues"
      );
      await releaseControlIssueForTeam(deps.db, input.teamId, input.issueId);
    },
  };
}

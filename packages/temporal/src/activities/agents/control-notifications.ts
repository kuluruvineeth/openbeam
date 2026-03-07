import type { Database } from "@openbeam/db";
import type { LogActivityInput, PublishRunEventInput } from "./control-types";

export interface ControlNotificationDependencies {
  db: Database;
}

export function createControlNotificationActivities(
  deps: ControlNotificationDependencies
) {
  return {
    async publishRunEvent(input: PublishRunEventInput): Promise<void> {
      const {
        publishRunStarted,
        publishRunCompleted,
        publishAgentStatusChanged,
      } = await import("@openbeam/services/control/realtime");

      switch (input.type) {
        case "run_started":
          await publishRunStarted(input.teamId, input.agentId, input.runId);
          break;
        case "run_completed":
          await publishRunCompleted(
            input.teamId,
            input.agentId,
            input.runId,
            input.status ?? "COMPLETED"
          );
          break;
        case "status_changed":
          await publishAgentStatusChanged(
            input.teamId,
            input.agentId,
            input.status ?? "IDLE"
          );
          break;
        default:
          break;
      }
    },

    async logActivity(input: LogActivityInput): Promise<void> {
      const { appendRunEvent } = await import(
        "@openbeam/services/control/heartbeat"
      );
      await appendRunEvent(deps.db, {
        teamId: input.teamId,
        runId: input.runId,
        agentId: input.agentId,
        seq: input.seq,
        eventType: input.eventType,
        stream: input.stream,
        level: input.level,
        message: input.message,
        payload: input.payload,
      });
    },
  };
}

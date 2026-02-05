import {
  CleanupInputSchema,
  type CleanupOutput,
  ConnectorCleanupInputSchema,
  type ConnectorCleanupOutput,
} from "@openplane/types/temporal/workflows";
import { condition, proxyActivities, setHandler } from "@temporalio/workflow";
import type { CleanupActivities } from "../../activities/database/types";
import type { StorageActivities } from "../../activities/storage/types";
import type { VespaActivities } from "../../activities/vespa/types";
import { cancelSignal, skipGracePeriodSignal } from "../types";

const cleanupActivities = proxyActivities<CleanupActivities>({
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "90m",
  heartbeatTimeout: "2m",
});

const vespaActivities = proxyActivities<VespaActivities>({
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "90m",
  heartbeatTimeout: "2m",
});

const storageActivities = proxyActivities<StorageActivities>({
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "90m",
  heartbeatTimeout: "2m",
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GRACE_PERIOD_HOURS = 72;

export async function cleanupWorkflow(
  rawInput: unknown
): Promise<CleanupOutput> {
  const input = CleanupInputSchema.parse(rawInput);

  const result: CleanupOutput = {
    staleDeleted: 0,
    orphansRemoved: 0,
    errors: [],
  };

  if (input.type === "DAILY") {
    const staleResult = await cleanupActivities.removeStaleDocuments({
      connectorId: input.teamId ?? "",
      olderThanMs: THIRTY_DAYS_MS,
    });
    result.staleDeleted = staleResult.deleted;

    const orphanResult = await vespaActivities.removeOrphanChunks({
      connectorId: input.teamId ?? "",
    });
    result.orphansRemoved = orphanResult.removed;
  }

  if (input.type === "DELETION_SYNC" && input.teamId) {
    await vespaActivities.deleteByConnector({
      connectorId: input.teamId,
    });

    await storageActivities.deleteByPrefix({
      prefix: `connectors/${input.teamId}/`,
    });
  }

  return result;
}

export async function connectorCleanupWorkflow(
  rawInput: unknown
): Promise<ConnectorCleanupOutput> {
  const input = ConnectorCleanupInputSchema.parse(rawInput);

  let cancelled = false;
  let skipGracePeriod = false;

  setHandler(cancelSignal, () => {
    cancelled = true;
  });

  setHandler(skipGracePeriodSignal, () => {
    skipGracePeriod = true;
  });

  const gracePeriodMs = GRACE_PERIOD_HOURS * 60 * 60 * 1000;

  const shouldProceed = await condition(
    () => cancelled || skipGracePeriod,
    gracePeriodMs
  );

  if (cancelled) {
    return { connectorId: input.connectorId, status: "cancelled" };
  }

  if (!(shouldProceed || skipGracePeriod)) {
    // Grace period expired naturally, proceed with cleanup
  }

  await vespaActivities.deleteByConnector({
    connectorId: input.connectorId,
  });

  await storageActivities.deleteByPrefix({
    prefix: `connectors/${input.connectorId}/`,
  });

  await cleanupActivities.deleteConnectorRecord({
    connectorId: input.connectorId,
  });

  return { connectorId: input.connectorId, status: "completed" };
}

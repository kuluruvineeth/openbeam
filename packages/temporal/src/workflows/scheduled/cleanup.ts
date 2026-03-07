import {
  CleanupInputSchema,
  type CleanupOutput,
  ConnectorCleanupInputSchema,
  type ConnectorCleanupOutput,
} from "@openbeam/types/temporal/workflows";
import { proxyActivities, setHandler } from "@temporalio/workflow";
import type { CleanupActivities } from "../../activities/database/types";
import type { StorageActivities } from "../../activities/storage/types";
import type { VespaActivities } from "../../activities/vespa/types";
import { conditionWithTimeout } from "../temporal-utils";
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

  if (input.type === "DAILY" && input.teamId) {
    const staleResult = await cleanupActivities.removeStaleDocuments({
      teamId: input.teamId,
      olderThanMs: THIRTY_DAYS_MS,
    });
    result.staleDeleted = staleResult.deleted;

    const connectorIds = await cleanupActivities.getTeamConnectorIds({
      teamId: input.teamId,
    });
    for (const connectorId of connectorIds) {
      const orphanResult = await vespaActivities.removeOrphanChunks({
        connectorId,
      });
      result.orphansRemoved += orphanResult.removed;
    }
  }

  if (input.type === "DELETION_SYNC" && input.connectorId) {
    await vespaActivities.deleteByConnector({
      connectorId: input.connectorId,
    });

    await storageActivities.deleteByPrefix({
      prefix: `connectors/${input.connectorId}/`,
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

  await conditionWithTimeout(() => cancelled || skipGracePeriod, gracePeriodMs);

  if (cancelled) {
    return { connectorId: input.connectorId, status: "cancelled" };
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

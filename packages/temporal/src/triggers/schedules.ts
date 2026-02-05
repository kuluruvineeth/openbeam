import { getTemporalClient } from "../client";
import { getTaskQueueForConnector, TASK_QUEUES } from "../config/task-queues";
import type {
  ConnectorSyncInput,
  DigestDeliveryInput,
} from "../workflows/types";

export interface SyncScheduleOptions {
  connectorId: string;
  connectorType: string;
  scheduleId?: string;
  cronExpression: string;
  syncType: "FULL" | "INCREMENTAL";
  timezone?: string;
  paused?: boolean;
}

export interface ScheduleInfo {
  scheduleId: string;
  connectorId: string;
  cronExpression: string;
  syncType: string;
  isPaused: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export async function createSyncSchedule(
  options: SyncScheduleOptions
): Promise<string> {
  const client = await getTemporalClient();

  const scheduleId =
    options.scheduleId ?? `sync-schedule-${options.connectorId}`;

  const input: ConnectorSyncInput = {
    connectorId: options.connectorId,
    syncHistoryId: `${scheduleId}-${Date.now()}`,
    syncType: options.syncType,
    trigger: "SCHEDULE",
  };

  const taskQueue = getTaskQueueForConnector(options.connectorType);

  await client.schedule.create({
    scheduleId,
    spec: {
      cronExpressions: [options.cronExpression],
      timezone: options.timezone ?? "UTC",
    },
    action: {
      type: "startWorkflow",
      workflowType: "connectorSyncWorkflow",
      taskQueue,
      args: [input],
    },
    state: {
      paused: options.paused ?? false,
    },
    memo: {
      connectorId: options.connectorId,
      connectorType: options.connectorType,
      syncType: options.syncType,
    },
  });

  return scheduleId;
}

export async function deleteSyncSchedule(scheduleId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.delete();
    return true;
  } catch {
    return false;
  }
}

export async function pauseSyncSchedule(scheduleId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.pause();
    return true;
  } catch {
    return false;
  }
}

export async function resumeSyncSchedule(scheduleId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.unpause();
    return true;
  } catch {
    return false;
  }
}

export async function listSyncSchedules(): Promise<ScheduleInfo[]> {
  const client = await getTemporalClient();

  const schedules: ScheduleInfo[] = [];

  for await (const schedule of client.schedule.list()) {
    const memo = schedule.memo as Record<string, unknown> | undefined;

    if (memo?.connectorId) {
      const description = await client.schedule
        .getHandle(schedule.scheduleId)
        .describe();

      schedules.push({
        scheduleId: schedule.scheduleId,
        connectorId: memo.connectorId as string,
        cronExpression: "",
        syncType: (memo.syncType as string) ?? "INCREMENTAL",
        isPaused: description.state.paused,
        lastRunAt: description.info.recentActions?.[0]?.scheduledAt,
        nextRunAt: description.info.nextActionTimes?.[0],
      });
    }
  }

  return schedules;
}

export async function updateSyncSchedule(
  scheduleId: string,
  updates: Partial<SyncScheduleOptions>
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.schedule.getHandle(scheduleId);

    if (updates.paused !== undefined) {
      if (updates.paused) {
        await handle.pause();
      } else {
        await handle.unpause();
      }
    }

    if (updates.cronExpression || updates.timezone || updates.syncType) {
      await handle.update((schedule) => {
        const newSpec = { ...schedule.spec };
        if (updates.cronExpression) {
          (newSpec as Record<string, unknown>).cronExpressions = [
            updates.cronExpression,
          ];
        }
        if (updates.timezone) {
          newSpec.timezone = updates.timezone;
        }
        schedule.spec = newSpec;

        if (updates.syncType && schedule.action.type === "startWorkflow") {
          const args = schedule.action.args as [ConnectorSyncInput] | undefined;
          if (args?.[0]) {
            args[0].syncType = updates.syncType;
          }
        }
        return schedule;
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function triggerSyncScheduleNow(
  scheduleId: string
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.trigger();
    return true;
  } catch {
    return false;
  }
}

export interface DigestScheduleOptions {
  subscriptionId: string;
  connectorId: string;
  userId: string;
  slackUserId: string;
  teamId: string;
  channelIds: string[];
  topics: string[];
  deliveryTime: string;
  timezone: string;
  frequency: "daily" | "weekly";
  paused?: boolean;
}

export interface DigestScheduleInfo {
  scheduleId: string;
  subscriptionId: string;
  connectorId: string;
  userId: string;
  teamId: string;
  frequency: string;
  deliveryTime: string;
  timezone: string;
  isPaused: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

function buildDigestCronExpression(
  deliveryTime: string,
  frequency: "daily" | "weekly"
): string {
  const [hours, minutes] = deliveryTime.split(":").map(Number);
  if (frequency === "weekly") {
    return `${minutes} ${hours} * * 1`;
  }
  return `${minutes} ${hours} * * *`;
}

export async function createDigestSchedule(
  options: DigestScheduleOptions
): Promise<string> {
  const client = await getTemporalClient();

  const scheduleId = `digest-${options.subscriptionId}`;

  const input: DigestDeliveryInput = {
    subscriptionId: options.subscriptionId,
    connectorId: options.connectorId,
    userId: options.userId,
    slackUserId: options.slackUserId,
    teamId: options.teamId,
    channelIds: options.channelIds,
    topics: options.topics,
    deliveryTime: options.deliveryTime,
    timezone: options.timezone,
    frequency: options.frequency,
  };

  const cronExpression = buildDigestCronExpression(
    options.deliveryTime,
    options.frequency
  );

  await client.schedule.create({
    scheduleId,
    spec: {
      cronExpressions: [cronExpression],
      timezone: options.timezone,
    },
    action: {
      type: "startWorkflow",
      workflowType: "digestDeliveryWorkflow",
      taskQueue: TASK_QUEUES.SCHEDULED,
      args: [input],
    },
    state: {
      paused: options.paused ?? false,
    },
    memo: {
      subscriptionId: options.subscriptionId,
      connectorId: options.connectorId,
      frequency: options.frequency,
      deliveryTime: options.deliveryTime,
      scheduleType: "digest",
    },
  });

  return scheduleId;
}

export async function deleteDigestSchedule(
  subscriptionId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `digest-${subscriptionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.delete();
    return true;
  } catch {
    return false;
  }
}

export async function pauseDigestSchedule(
  subscriptionId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `digest-${subscriptionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.pause();
    return true;
  } catch {
    return false;
  }
}

export async function resumeDigestSchedule(
  subscriptionId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `digest-${subscriptionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.unpause();
    return true;
  } catch {
    return false;
  }
}

export async function listDigestSchedules(
  teamId?: string
): Promise<DigestScheduleInfo[]> {
  const client = await getTemporalClient();

  const schedules: DigestScheduleInfo[] = [];

  for await (const schedule of client.schedule.list()) {
    const memo = schedule.memo as Record<string, unknown> | undefined;

    if (memo?.scheduleType === "digest") {
      if (teamId && memo.teamId !== teamId) {
        continue;
      }

      const description = await client.schedule
        .getHandle(schedule.scheduleId)
        .describe();

      schedules.push({
        scheduleId: schedule.scheduleId,
        subscriptionId: memo.subscriptionId as string,
        connectorId: memo.connectorId as string,
        userId: memo.userId as string,
        teamId: memo.teamId as string,
        frequency: memo.frequency as string,
        deliveryTime: memo.deliveryTime as string,
        timezone: description.spec.timezone ?? "UTC",
        isPaused: description.state.paused,
        lastRunAt: description.info.recentActions?.[0]?.scheduledAt,
        nextRunAt: description.info.nextActionTimes?.[0],
      });
    }
  }

  return schedules;
}

export async function updateDigestSchedule(
  subscriptionId: string,
  updates: Partial<DigestScheduleOptions>
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `digest-${subscriptionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);

    if (updates.paused !== undefined) {
      if (updates.paused) {
        await handle.pause();
      } else {
        await handle.unpause();
      }
    }

    if (
      updates.deliveryTime ||
      updates.frequency ||
      updates.timezone ||
      updates.channelIds ||
      updates.topics
    ) {
      await handle.update((schedule) => {
        const newSpec = { ...schedule.spec };

        if (updates.deliveryTime || updates.frequency) {
          const args = schedule.action.args as unknown as [DigestDeliveryInput];
          const currentInput = args[0];
          const deliveryTime =
            updates.deliveryTime ?? currentInput.deliveryTime;
          const frequency = updates.frequency ?? currentInput.frequency;
          const cronExpression = buildDigestCronExpression(
            deliveryTime,
            frequency
          );
          (newSpec as Record<string, unknown>).cronExpressions = [
            cronExpression,
          ];
        }

        if (updates.timezone) {
          newSpec.timezone = updates.timezone;
        }

        schedule.spec = newSpec;

        if (schedule.action.type === "startWorkflow") {
          const args = schedule.action.args as [DigestDeliveryInput];
          if (args?.[0]) {
            if (updates.channelIds) {
              args[0].channelIds = updates.channelIds;
            }
            if (updates.topics) {
              args[0].topics = updates.topics;
            }
            if (updates.deliveryTime) {
              args[0].deliveryTime = updates.deliveryTime;
            }
            if (updates.frequency) {
              args[0].frequency = updates.frequency;
            }
            if (updates.timezone) {
              args[0].timezone = updates.timezone;
            }
          }
        }

        return schedule;
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function triggerDigestScheduleNow(
  subscriptionId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `digest-${subscriptionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.trigger();
    return true;
  } catch {
    return false;
  }
}

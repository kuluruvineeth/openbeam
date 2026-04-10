import type { Database } from "@openbeam/db";
import type {
  BotPlatform,
  NotificationEventType,
  NotificationPriority,
} from "@openbeam/types/bot";
import { DEDUP_WINDOW_SECONDS, PRIORITY_BY_EVENT } from "@openbeam/types/bot";
import { resolveTargetPlatforms } from "./router";
import { evaluateThrottle } from "./throttle";

interface EmitParams {
  teamId: string;
  userId?: string;
  eventType: NotificationEventType;
  priority?: NotificationPriority;
  payload: Record<string, unknown>;
  connectorId?: string;
  dedupKey?: string;
}

interface EmitDeps {
  db: Database;
  listLinkedUsers: (
    db: Database,
    teamId: string
  ) => Promise<
    Array<{ userId: string; platform: BotPlatform; platformUserId: string }>
  >;
  deliverToUser: (params: {
    eventId: string;
    userId: string;
    teamId: string;
    platform: BotPlatform;
    eventType: string;
    payload: Record<string, unknown>;
  }) => Promise<void>;
}

export async function emitNotification(
  params: EmitParams,
  deps: EmitDeps
): Promise<void> {
  const priority =
    params.priority ?? PRIORITY_BY_EVENT[params.eventType] ?? "NORMAL";
  const dedupKey =
    params.dedupKey ?? `${params.eventType}:${params.connectorId ?? "global"}`;

  if (params.userId) {
    await emitForUser(
      { ...params, priority, dedupKey, userId: params.userId },
      deps
    );
    return;
  }

  const linkedUsers = await deps.listLinkedUsers(deps.db, params.teamId);
  const uniqueUserIds = [...new Set(linkedUsers.map((l) => l.userId))];

  for (const userId of uniqueUserIds) {
    await emitForUser({ ...params, priority, dedupKey, userId }, deps);
  }
}

async function emitForUser(
  params: EmitParams & {
    userId: string;
    priority: NotificationPriority;
    dedupKey: string;
  },
  deps: EmitDeps
): Promise<void> {
  const event = await deps.db.botNotificationEvent.create({
    data: {
      teamId: params.teamId,
      userId: params.userId,
      eventType: params.eventType,
      priority: params.priority,
      payload: JSON.parse(JSON.stringify(params.payload)),
      connectorId: params.connectorId,
      dedupKey: params.dedupKey,
    },
  });

  const preference = await deps.db.botNotificationPreference.findFirst({
    where: {
      teamId: params.teamId,
      userId: params.userId,
      eventType: params.eventType,
    },
  });

  const frequency = (preference?.frequency ?? "IMMEDIATE") as
    | "IMMEDIATE"
    | "HOURLY"
    | "DAILY"
    | "WEEKLY"
    | "OFF";

  const dedupWindowSeconds =
    DEDUP_WINDOW_SECONDS[params.eventType as NotificationEventType] ?? 300;

  const decision = await evaluateThrottle({
    teamId: params.teamId,
    userId: params.userId,
    eventType: params.eventType,
    priority: params.priority,
    dedupKey: params.dedupKey,
    dedupWindowSeconds,
    frequency,
    quietHoursStart: preference?.quietHoursStart ?? null,
    quietHoursEnd: preference?.quietHoursEnd ?? null,
    timezone: preference?.timezone ?? "UTC",
  });

  if (decision.action === "suppress") {
    await deps.db.botNotificationEvent.update({
      where: { id: event.id },
      data: { suppressedAt: new Date(), suppressReason: decision.reason },
    });
    return;
  }

  if (decision.action === "queue_digest") {
    return;
  }

  const linkedUsers = await deps.listLinkedUsers(deps.db, params.teamId);
  const userLinks = linkedUsers.filter((l) => l.userId === params.userId);
  const linkedPlatforms = userLinks.map((l) => l.platform) as BotPlatform[];

  const targets = await resolveTargetPlatforms({
    teamId: params.teamId,
    userId: params.userId,
    linkedPlatforms,
    priority: params.priority,
    preferredPlatform: null,
    timezone: preference?.timezone ?? "UTC",
  });

  for (const platform of targets) {
    await deps.deliverToUser({
      eventId: event.id,
      userId: params.userId,
      teamId: params.teamId,
      platform,
      eventType: params.eventType,
      payload: params.payload,
    });

    await deps.db.botNotificationEvent.update({
      where: { id: event.id },
      data: { deliveredAt: new Date(), platform },
    });
  }
}

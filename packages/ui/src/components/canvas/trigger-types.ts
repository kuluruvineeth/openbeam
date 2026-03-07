"use client";

import type { StartNodeConfig } from "@openbeam/types/canvas";
import { Icons } from "../icons";

export type TriggerTypeId = NonNullable<StartNodeConfig["triggerType"]>;

export interface TriggerTypeConfig {
  id: TriggerTypeId;
  name: string;
  shortDescription: string;
  description: string;
  icon: (typeof Icons)[keyof typeof Icons];
}

export const TRIGGER_TYPES: Record<TriggerTypeId, TriggerTypeConfig> = {
  manual: {
    id: "manual",
    name: "Manual",
    shortDescription: "Click to run",
    description: "Trigger manually via UI or API",
    icon: Icons.Play,
  },
  schedule: {
    id: "schedule",
    name: "Schedule",
    shortDescription: "Runs on schedule",
    description: "Run on a cron schedule",
    icon: Icons.Clock,
  },
  webhook: {
    id: "webhook",
    name: "Webhook",
    shortDescription: "HTTP trigger",
    description: "Trigger via HTTP webhook",
    icon: Icons.Webhook,
  },
  event: {
    id: "event",
    name: "Event",
    shortDescription: "System event",
    description: "Trigger on system events",
    icon: Icons.Zap,
  },
};

export const TRIGGER_TYPE_LIST = Object.values(TRIGGER_TYPES);

export function getTriggerType(id: string | undefined): TriggerTypeConfig {
  if (id && id in TRIGGER_TYPES) {
    return TRIGGER_TYPES[id as TriggerTypeId];
  }
  return TRIGGER_TYPES.manual;
}

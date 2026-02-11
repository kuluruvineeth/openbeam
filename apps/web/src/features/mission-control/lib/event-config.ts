"use client";

import { Icons } from "@openplane/ui";
import type { ComponentType } from "react";

type IconProps = { size: number };

type EventTypeConfig = {
  icon: ComponentType<IconProps>;
  summaryTemplate: string;
  shimmerWhenActive: boolean;
  priority: "critical" | "high" | "medium" | "low";
};

export const EVENT_TYPE_CONFIG: Record<string, EventTypeConfig> = {
  "mission.started": {
    icon: Icons.Play,
    summaryTemplate: "Mission started",
    shimmerWhenActive: false,
    priority: "high",
  },
  "mission.completed": {
    icon: Icons.CheckCircle2,
    summaryTemplate: "Mission completed",
    shimmerWhenActive: false,
    priority: "high",
  },
  "mission.failed": {
    icon: Icons.AlertCircle,
    summaryTemplate: "Mission failed: {error}",
    shimmerWhenActive: false,
    priority: "critical",
  },
  "mission.paused": {
    icon: Icons.Pause,
    summaryTemplate: "Mission paused",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "mission.resumed": {
    icon: Icons.Play,
    summaryTemplate: "Mission resumed",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "run.started": {
    icon: Icons.Play,
    summaryTemplate: "{agentName} started working",
    shimmerWhenActive: true,
    priority: "medium",
  },
  "run.completed": {
    icon: Icons.Check,
    summaryTemplate: "{agentName} finished",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "run.failed": {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} failed: {error}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "task.claimed": {
    icon: Icons.ArrowRight,
    summaryTemplate: "{agentName} claimed: {taskTitle}",
    shimmerWhenActive: true,
    priority: "medium",
  },
  "task.completed": {
    icon: Icons.Check,
    summaryTemplate: "{agentName} completed task",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "task.failed": {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} failed task: {error}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "tool.started": {
    icon: Icons.Settings,
    summaryTemplate: "{agentName} using {toolName}",
    shimmerWhenActive: true,
    priority: "low",
  },
  "tool.completed": {
    icon: Icons.Settings,
    summaryTemplate: "{toolName} done ({latencyMs}ms)",
    shimmerWhenActive: false,
    priority: "low",
  },
  "approval.requested": {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} needs approval: {intent}",
    shimmerWhenActive: true,
    priority: "critical",
  },
  "approval.resolved": {
    icon: Icons.Check,
    summaryTemplate: "Approval {decision}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "artifact.published": {
    icon: Icons.Download,
    summaryTemplate: "{agentName} published: {title}",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "budget.updated": {
    icon: Icons.DollarSign,
    summaryTemplate: "Budget: {consumed}/{budget}",
    shimmerWhenActive: false,
    priority: "low",
  },
};

export const HIDDEN_EVENT_TYPES = new Set(["heartbeat"]);

export const TERMINAL_EVENT_SUFFIXES = [
  ".completed",
  ".failed",
  ".cancelled",
  ".resolved",
];

export function isActiveEvent(
  eventType: string,
  events: Array<{ eventType: string }>
): boolean {
  const config = EVENT_TYPE_CONFIG[eventType];
  if (!config?.shimmerWhenActive) {
    return false;
  }

  const base = eventType.split(".")[0];
  return !events.some((e) => {
    const eBase = e.eventType.split(".")[0];
    return (
      eBase === base &&
      TERMINAL_EVENT_SUFFIXES.some((s) => e.eventType.endsWith(s))
    );
  });
}

export function resolveTemplate(
  template: string,
  payload: Record<string, unknown> | undefined,
  agentName?: string
): string {
  let result = template;
  if (agentName) {
    result = result.replace("{agentName}", agentName);
  }
  if (payload) {
    for (const [key, value] of Object.entries(payload)) {
      result = result.replace(`{${key}}`, String(value ?? ""));
    }
  }
  return result.replace(/\{[^}]+\}/g, "");
}

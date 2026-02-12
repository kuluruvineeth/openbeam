"use client";

import { Icons } from "@openplane/ui";
import type { ComponentType } from "react";
import { resolveTemplateText } from "./template-text";

type IconProps = { size: number };

type EventTypeConfig = {
  icon: ComponentType<IconProps>;
  summaryTemplate: string;
  shimmerWhenActive: boolean;
  priority: "critical" | "high" | "medium" | "low";
  expandable?: boolean;
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
    summaryTemplate: "Mission failed",
    shimmerWhenActive: false,
    priority: "critical",
  },
  "mission.cancelled": {
    icon: Icons.Close,
    summaryTemplate: "Mission cancelled",
    shimmerWhenActive: false,
    priority: "high",
  },
  orchestrator_started: {
    icon: Icons.Play,
    summaryTemplate: "Mission orchestrator started",
    shimmerWhenActive: false,
    priority: "high",
  },
  orchestrator_completed: {
    icon: Icons.CheckCircle2,
    summaryTemplate: "Mission completed",
    shimmerWhenActive: false,
    priority: "high",
  },
  orchestrator_failed: {
    icon: Icons.AlertCircle,
    summaryTemplate: "Mission failed",
    shimmerWhenActive: false,
    priority: "critical",
  },
  orchestrator_paused: {
    icon: Icons.Pause,
    summaryTemplate: "Mission paused",
    shimmerWhenActive: false,
    priority: "medium",
  },
  orchestrator_cancelled: {
    icon: Icons.Close,
    summaryTemplate: "Mission cancelled",
    shimmerWhenActive: false,
    priority: "high",
  },
  budget_exceeded: {
    icon: Icons.DollarSign,
    summaryTemplate: "Budget limit reached",
    shimmerWhenActive: false,
    priority: "critical",
  },
  "budget.set": {
    icon: Icons.Coins,
    summaryTemplate: "Budget updated to {budgetCents} cents",
    shimmerWhenActive: false,
    priority: "low",
  },
  "cost.updated": {
    icon: Icons.Coins,
    summaryTemplate: "Spend updated",
    shimmerWhenActive: false,
    priority: "low",
  },
  agent_dispatched: {
    icon: Icons.ArrowRight,
    summaryTemplate: '{agentName} dispatched for "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
  },
  agent_run_started: {
    icon: Icons.Play,
    summaryTemplate: "{agentName} started working",
    shimmerWhenActive: true,
    priority: "medium",
  },
  "run.started": {
    icon: Icons.Play,
    summaryTemplate: "{agentName} started working",
    shimmerWhenActive: true,
    priority: "medium",
  },
  agent_run_completed: {
    icon: Icons.Check,
    summaryTemplate:
      "{agentName} finished ({steps} steps, {tokensUsed} tokens)",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "run.completed": {
    icon: Icons.Check,
    summaryTemplate:
      "{agentName} finished ({steps} steps, {tokensUsed} tokens)",
    shimmerWhenActive: false,
    priority: "medium",
  },
  agent_run_failed: {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} failed",
    shimmerWhenActive: false,
    priority: "high",
  },
  "run.failed": {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} failed",
    shimmerWhenActive: false,
    priority: "high",
  },
  agent_step_completed: {
    icon: Icons.BotIcon,
    summaryTemplate: "{agentName} — step {step}",
    shimmerWhenActive: false,
    priority: "medium",
    expandable: true,
  },
  "task.claimed": {
    icon: Icons.ArrowRight,
    summaryTemplate: '{agentName} claimed "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
  },
  "task.completed": {
    icon: Icons.CheckCircle2,
    summaryTemplate: '{agentName} completed "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
  },
  "tool.started": {
    icon: Icons.Wrench,
    summaryTemplate: "{agentName} started {toolName}",
    shimmerWhenActive: true,
    priority: "medium",
  },
  "tool.completed": {
    icon: Icons.Check,
    summaryTemplate: "{agentName} completed {toolName}",
    shimmerWhenActive: false,
    priority: "low",
  },
  "tool.failed": {
    icon: Icons.AlertCircle,
    summaryTemplate: "{agentName} failed {toolName}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "approval.requested": {
    icon: Icons.ShieldAlert,
    summaryTemplate: "{agentName} requested approval for {intent}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "approval.resolved": {
    icon: Icons.UserCheck,
    summaryTemplate: "{agentName} approval resolved",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "artifact.published": {
    icon: Icons.FileText,
    summaryTemplate: 'Output published: "{artifactTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
    expandable: true,
  },
};

export const HIDDEN_EVENT_TYPES = new Set(["heartbeat"]);

const ACTIVE_EVENT_TERMINALS: Record<string, string[]> = {
  agent_run_started: ["agent_run_completed", "agent_run_failed"],
  "run.started": ["run.completed", "run.failed"],
  "tool.started": ["tool.completed", "tool.failed"],
};

export function isActiveEvent(
  eventType: string,
  events: Array<{ eventType: string; agentName?: string }>,
  agentName?: string
): boolean {
  const config = EVENT_TYPE_CONFIG[eventType];
  if (!config?.shimmerWhenActive) {
    return false;
  }

  const terminals = ACTIVE_EVENT_TERMINALS[eventType];
  if (!terminals) {
    return false;
  }

  return !events.some(
    (e) =>
      terminals.includes(e.eventType) &&
      (!agentName || e.agentName === agentName)
  );
}

export function resolveTemplate(
  template: string,
  payload: Record<string, unknown> | undefined,
  agentName?: string
): string {
  return resolveTemplateText(template, payload, agentName);
}

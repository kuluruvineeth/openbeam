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
    summaryTemplate: "{agentName} - step {step}",
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
  "agent.spawned": {
    icon: Icons.GitBranch,
    summaryTemplate: "{agentName} spawned {childAgentName}",
    shimmerWhenActive: false,
    priority: "high",
  },
  agent_spawned: {
    icon: Icons.GitBranch,
    summaryTemplate: "{agentName} spawned {childAgentName}",
    shimmerWhenActive: false,
    priority: "high",
  },
  "agent.message_sent": {
    icon: Icons.MessageSquare,
    summaryTemplate: "{fromAgentName} messaged {toAgentName}",
    shimmerWhenActive: false,
    priority: "low",
  },
  agent_message_sent: {
    icon: Icons.MessageSquare,
    summaryTemplate: "{fromAgentName} messaged {toAgentName}",
    shimmerWhenActive: false,
    priority: "low",
  },
  "agent.message_received": {
    icon: Icons.MessageSquare,
    summaryTemplate: "{toAgentName} received a message",
    shimmerWhenActive: false,
    priority: "low",
  },
  agent_message_received: {
    icon: Icons.MessageSquare,
    summaryTemplate: "{toAgentName} received a message",
    shimmerWhenActive: false,
    priority: "low",
  },
  "agent.reflection": {
    icon: Icons.BrainCircuit,
    summaryTemplate: "{agentName} self-evaluated (score {score})",
    shimmerWhenActive: true,
    priority: "medium",
  },
  agent_self_evaluated: {
    icon: Icons.BrainCircuit,
    summaryTemplate: "{agentName} self-evaluated (score {progressScore})",
    shimmerWhenActive: true,
    priority: "medium",
  },
  "agent.replan": {
    icon: Icons.RefreshCw,
    summaryTemplate: "{agentName} replanning: {reason}",
    shimmerWhenActive: false,
    priority: "high",
    expandable: true,
  },
  agent_replanned: {
    icon: Icons.RefreshCw,
    summaryTemplate: "{agentName} replanned strategy",
    shimmerWhenActive: false,
    priority: "high",
    expandable: true,
  },
  "agent.escalated": {
    icon: Icons.AlertTriangle,
    summaryTemplate: "{agentName} escalated: {reason}",
    shimmerWhenActive: false,
    priority: "critical",
    expandable: true,
  },
  agent_escalated: {
    icon: Icons.AlertTriangle,
    summaryTemplate: "{agentName} escalated task",
    shimmerWhenActive: false,
    priority: "critical",
    expandable: true,
  },
  "agent.timeout_extended": {
    icon: Icons.Timer,
    summaryTemplate: "{agentName} timeout tier -> {tier}",
    shimmerWhenActive: false,
    priority: "medium",
  },
  agent_timeout_extended: {
    icon: Icons.Timer,
    summaryTemplate: "{agentName} timeout tier -> {tier}",
    shimmerWhenActive: false,
    priority: "medium",
  },
  "cross_mission.knowledge_imported": {
    icon: Icons.Link,
    summaryTemplate: "Knowledge imported from {linkedMissionName}",
    shimmerWhenActive: false,
    priority: "medium",
    expandable: true,
  },
  "cross_mission.agent_shared": {
    icon: Icons.Link,
    summaryTemplate: "Agent shared with {linkedMissionName}",
    shimmerWhenActive: false,
    priority: "medium",
  },
  task_self_claimed: {
    icon: Icons.Hand,
    summaryTemplate: '{agentName} self-claimed "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
  },
  agent_claim_rejected: {
    icon: Icons.ShieldAlert,
    summaryTemplate: "{agentName} claim rejected: {reason}",
    shimmerWhenActive: false,
    priority: "medium",
  },
  peer_review_requested: {
    icon: Icons.Eye,
    summaryTemplate: '{agentName} requested peer review for "{taskTitle}"',
    shimmerWhenActive: true,
    priority: "medium",
  },
  peer_review_submitted: {
    icon: Icons.CheckSquare,
    summaryTemplate: "{agentName} reviewed: {verdict} (score {qualityScore})",
    shimmerWhenActive: false,
    priority: "high",
    expandable: true,
  },
  peer_review_consensus: {
    icon: Icons.Scale,
    summaryTemplate:
      "Peer review consensus: {verdict} (avg {averageQualityScore})",
    shimmerWhenActive: false,
    priority: "high",
    expandable: true,
  },
  reviewer_assigned: {
    icon: Icons.UserCheck,
    summaryTemplate: '{reviewerAgentName} assigned to review "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "medium",
  },
  review_gating_enforced: {
    icon: Icons.ShieldAlert,
    summaryTemplate: '{agentName} task redirected to review: "{taskTitle}"',
    shimmerWhenActive: true,
    priority: "high",
  },
  review_timeout: {
    icon: Icons.Timer,
    summaryTemplate: 'Review expired for "{taskTitle}" ({reviewerAgentName})',
    shimmerWhenActive: false,
    priority: "high",
  },
  reviewer_assignment_failed: {
    icon: Icons.AlertCircle,
    summaryTemplate: 'No eligible reviewer found for "{taskTitle}"',
    shimmerWhenActive: false,
    priority: "high",
  },
  standup_round_started: {
    icon: Icons.Users,
    summaryTemplate:
      "Standup round #{roundId} started — {activeAgentCount} agents",
    shimmerWhenActive: true,
    priority: "medium",
  },
  standup_summary: {
    icon: Icons.Clipboard,
    summaryTemplate:
      "Standup: {overallHealth} — {reportCount} reported, {conflictCount} conflicts",
    shimmerWhenActive: false,
    priority: "high",
    expandable: true,
  },
  "chain.progress": {
    icon: Icons.Loader2,
    summaryTemplate: "{agentName} chunk progress {current}/{total}",
    shimmerWhenActive: true,
    priority: "low",
  },
};

export const HIDDEN_EVENT_TYPES = new Set([
  "heartbeat",
  "agent.message_received",
  "agent_message_received",
  "chain.progress",
]);

const ACTIVE_EVENT_TERMINALS: Record<string, string[]> = {
  agent_run_started: ["agent_run_completed", "agent_run_failed"],
  "run.started": ["run.completed", "run.failed"],
  "tool.started": ["tool.completed", "tool.failed"],
  "agent.reflection": [],
  agent_self_evaluated: [
    "agent_replanned",
    "agent_escalated",
    "agent_run_completed",
    "agent_run_failed",
  ],
  peer_review_requested: ["peer_review_submitted", "peer_review_consensus"],
  review_gating_enforced: ["peer_review_consensus", "review_timeout"],
  standup_round_started: ["standup_summary"],
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

  if (terminals.length === 0) {
    return true;
  }

  return !events.some(
    (event) =>
      terminals.includes(event.eventType) &&
      (!agentName || event.agentName === agentName)
  );
}

export function resolveTemplate(
  template: string,
  payload: Record<string, unknown> | undefined,
  agentName?: string
): string {
  return resolveTemplateText(template, payload, agentName);
}

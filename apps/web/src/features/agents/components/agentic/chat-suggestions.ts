import { Icons } from "@openbeam/ui";
import type { ComponentType } from "react";

interface Suggestion {
  icon: ComponentType<{ className?: string }>;
  label: string;
  prompt: string;
}

const CONNECTOR_SUGGESTIONS: Record<string, Suggestion> = {
  SLACK: {
    icon: Icons.MessageSquare,
    label: "Monitor Slack channels",
    prompt:
      "Create a workflow that monitors my Slack channels and summarizes important messages",
  },
  GMAIL: {
    icon: Icons.Mail,
    label: "Process emails",
    prompt:
      "Build a workflow that processes incoming emails and categorizes them automatically",
  },
  GOOGLE_DRIVE: {
    icon: Icons.File,
    label: "Search documents",
    prompt: "Create a workflow that searches across my Google Drive documents",
  },
  NOTION: {
    icon: Icons.FileText,
    label: "Sync Notion pages",
    prompt:
      "Build a workflow that monitors Notion pages and triggers actions on updates",
  },
  LINEAR: {
    icon: Icons.GitBranch,
    label: "Track Linear issues",
    prompt:
      "Create a workflow that tracks Linear issues and sends notifications on status changes",
  },
  GITHUB: {
    icon: Icons.GitBranch,
    label: "Monitor GitHub repos",
    prompt:
      "Build a workflow that monitors GitHub repositories for new PRs and issues",
  },
};

const FALLBACK_SUGGESTIONS: readonly Suggestion[] = [
  {
    icon: Icons.Workflow,
    label: "Create a workflow",
    prompt:
      "Create a workflow that monitors my Slack channels and sends summaries to email",
  },
  {
    icon: Icons.Zap,
    label: "Automate a task",
    prompt:
      "Build an automation that triggers when new issues are created in Linear",
  },
  {
    icon: Icons.SparklesIcon,
    label: "Build an AI agent",
    prompt:
      "Create an AI agent that can search across my documents and answer questions",
  },
];

const MAX_SUGGESTIONS = 4;

export function buildSuggestions(
  connectors: readonly { app: string }[] | null | undefined
): readonly Suggestion[] {
  if (!connectors || connectors.length === 0) {
    return FALLBACK_SUGGESTIONS;
  }

  const connectorTypes = new Set(connectors.map((c) => c.app.toUpperCase()));
  const dynamic: Suggestion[] = [];

  for (const type of connectorTypes) {
    const suggestion = CONNECTOR_SUGGESTIONS[type];
    if (suggestion && dynamic.length < MAX_SUGGESTIONS) {
      dynamic.push(suggestion);
    }
  }

  if (dynamic.length === 0) {
    return FALLBACK_SUGGESTIONS;
  }

  return dynamic;
}

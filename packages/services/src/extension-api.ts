import type { ExtensionActionProposal } from "@openplane/types/services/extension/actions";
import { ExtensionActionProposalSchema } from "@openplane/types/services/extension/actions";
import type { ExtensionChatSubmitResponse } from "@openplane/types/services/extension/rpc";
import { ExtensionChatSubmitResponseSchema } from "@openplane/types/services/extension/rpc";

export type ExtensionServiceErrorCode =
  | "MISSING_TEAM"
  | "HOST_BLOCKED"
  | "INVALID_PROMPT";

export class ExtensionServiceError extends Error {
  readonly code: ExtensionServiceErrorCode;

  constructor(code: ExtensionServiceErrorCode, message: string) {
    super(message);
    this.name = "ExtensionServiceError";
    this.code = code;
  }
}

function resolveTeamId(teamId: string | null): string {
  if (!teamId) {
    throw new ExtensionServiceError("MISSING_TEAM", "team_id is required");
  }

  return teamId;
}

function classifyPrompt(prompt: string): {
  kind: ExtensionActionProposal["kind"];
  toolName: string;
  risk: ExtensionActionProposal["risk"];
  requiresApproval: boolean;
} {
  const normalizedPrompt = prompt.toLowerCase();

  if (
    normalizedPrompt.includes("fill ") ||
    normalizedPrompt.includes("type ") ||
    normalizedPrompt.includes("submit ")
  ) {
    return {
      kind: "fill",
      toolName: "content.fill",
      risk: "high",
      requiresApproval: true,
    };
  }

  if (normalizedPrompt.includes("click ")) {
    return {
      kind: "click",
      toolName: "content.click",
      risk: "medium",
      requiresApproval: true,
    };
  }

  if (
    normalizedPrompt.includes("navigate ") ||
    normalizedPrompt.includes("open ")
  ) {
    return {
      kind: "navigate",
      toolName: "content.navigate",
      risk: "medium",
      requiresApproval: true,
    };
  }

  return {
    kind: "extract",
    toolName: "content.extract",
    risk: "low",
    requiresApproval: false,
  };
}

function buildSummary(prompt: string, hostname: string | null): string {
  const compactPrompt = prompt.replace(/\s+/g, " ").trim();
  const shortPrompt =
    compactPrompt.length > 140
      ? `${compactPrompt.slice(0, 137).trimEnd()}...`
      : compactPrompt;

  if (!hostname) {
    return `Analyze page context: ${shortPrompt}`;
  }

  return `Analyze ${hostname}: ${shortPrompt}`;
}

export function submitExtensionChatForTeam(input: {
  teamId: string | null;
  sessionId: string;
  prompt: string;
  pageUrl?: string;
  hostDecisionMode?: "allow" | "ask" | "block";
}): ExtensionChatSubmitResponse {
  resolveTeamId(input.teamId);

  const trimmedPrompt = input.prompt.trim();
  if (!trimmedPrompt) {
    throw new ExtensionServiceError("INVALID_PROMPT", "Prompt is required");
  }

  if (input.hostDecisionMode === "block") {
    throw new ExtensionServiceError(
      "HOST_BLOCKED",
      "This host is blocked by extension policy"
    );
  }

  const hostname = input.pageUrl ? new URL(input.pageUrl).hostname : null;
  const action = classifyPrompt(trimmedPrompt);

  const proposal = ExtensionActionProposalSchema.parse({
    actionId: crypto.randomUUID(),
    sessionId: input.sessionId,
    toolName: action.toolName,
    kind: action.kind,
    summary: buildSummary(trimmedPrompt, hostname),
    targetUrl: input.pageUrl,
    input: {
      prompt: trimmedPrompt,
    },
    risk: action.risk,
    requiresApproval: action.requiresApproval,
  });

  return ExtensionChatSubmitResponseSchema.parse({
    proposal,
  });
}

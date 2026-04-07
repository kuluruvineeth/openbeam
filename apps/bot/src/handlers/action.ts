import { dispatchAction } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";

const COMMAND_PREFIX_RE = /^\/?\w+\s*/;
const WHITESPACE_RE = /\s+/;

export async function handleAction(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const parsed = parseActionCommand(message.text);

  if (!parsed) {
    return {
      type: "error",
      text: "Invalid action format. Use: action <connectorId> <actionId> [params as JSON]",
    };
  }

  const result = await dispatchAction({
    connectorId: parsed.connectorId,
    actionId: parsed.actionId,
    params: parsed.params,
    teamId: identity.teamId,
    userId: identity.userId,
    source: "bot",
  });

  return {
    type: "action_result",
    text: result.success
      ? `Action "${parsed.actionId}" completed successfully.`
      : `Action "${parsed.actionId}" failed: ${result.error ?? "unknown error"}`,
    actionResult: {
      action: parsed.actionId,
      success: result.success,
      message: result.success ? "Completed" : (result.error ?? "Failed"),
    },
  };
}

interface ParsedAction {
  connectorId: string;
  actionId: string;
  params: Record<string, unknown>;
}

function parseActionCommand(text: string): ParsedAction | null {
  const cleaned = text.replace(COMMAND_PREFIX_RE, "").trim();
  const parts = cleaned.split(WHITESPACE_RE);

  if (parts.length < 2) {
    return null;
  }

  const connectorId = parts[0] ?? "";
  const actionId = parts[1] ?? "";
  let params: Record<string, unknown> = {};

  const jsonStart = cleaned.indexOf("{");
  if (jsonStart !== -1) {
    try {
      params = JSON.parse(cleaned.slice(jsonStart));
    } catch {
      return null;
    }
  }

  return { connectorId, actionId, params };
}

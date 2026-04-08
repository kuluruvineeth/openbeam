import { dispatchAction } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { stripCommandPrefix } from "./utils";

const WHITESPACE_RE = /\s+/;

export async function handleAction(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const parsed = parseActionCommand(message.text);

  if (!parsed.ok) {
    return { type: "error", text: parsed.error };
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

type ParseResult =
  | {
      ok: true;
      connectorId: string;
      actionId: string;
      params: Record<string, unknown>;
    }
  | { ok: false; error: string };

function parseActionCommand(text: string): ParseResult {
  const cleaned = stripCommandPrefix(text, "action");
  const parts = cleaned.split(WHITESPACE_RE);

  if (parts.length < 2) {
    return {
      ok: false,
      error: "Usage: action <connectorId> <actionId> [params as JSON]",
    };
  }

  const connectorId = parts[0] ?? "";
  const actionId = parts[1] ?? "";
  let params: Record<string, unknown> = {};

  const jsonStart = cleaned.indexOf("{");
  if (jsonStart !== -1) {
    try {
      params = JSON.parse(cleaned.slice(jsonStart));
    } catch {
      return { ok: false, error: "Invalid JSON in params" };
    }
  }

  return { ok: true, connectorId, actionId, params };
}

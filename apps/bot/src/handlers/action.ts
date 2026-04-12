import { deriveApprovalPattern } from "@openbeam/ai";
import { dispatchAction } from "@openbeam/services";
import type {
  BotResponse,
  ResponseButton,
  UnifiedMessage,
} from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { storePendingAction } from "../lib/pending-actions";
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

  const approval = deriveApprovalPattern(
    (parsed.stakes ?? "low") as "low" | "medium" | "high",
    parsed.reversible ? "easy" : "irreversible"
  );

  if (approval === "auto") {
    return executeAction(parsed, identity);
  }

  const pendingId = await storePendingAction(
    message.platform,
    identity.userId,
    {
      connectorId: parsed.connectorId,
      actionId: parsed.actionId,
      params: parsed.params,
      teamId: identity.teamId,
      userId: identity.userId,
      description: `${parsed.actionId} on ${parsed.connectorId}`,
      stakes: parsed.stakes ?? "low",
    }
  );

  const buttons: ResponseButton[] = [
    {
      label: "Confirm",
      action: `confirm:${pendingId}`,
      value: pendingId,
      style: "primary",
    },
    {
      label: "Cancel",
      action: `cancel:${pendingId}`,
      value: pendingId,
      style: "danger",
    },
  ];

  return {
    type: "text",
    text: `Confirm: ${parsed.actionId} on ${parsed.connectorId}?`,
    buttons,
    responseId: crypto.randomUUID(),
  };
}

async function executeAction(
  parsed: ParsedAction,
  identity: ResolvedIdentity
): Promise<BotResponse> {
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
      ? `Action "${parsed.actionId}" completed.`
      : `Action "${parsed.actionId}" failed: ${result.error ?? "unknown error"}`,
    actionResult: {
      action: parsed.actionId,
      success: result.success,
      message: result.success ? "Completed" : (result.error ?? "Failed"),
    },
  };
}

interface ParsedAction {
  ok: true;
  connectorId: string;
  actionId: string;
  params: Record<string, unknown>;
  stakes?: string;
  reversible?: boolean;
}

type ParseResult = ParsedAction | { ok: false; error: string };

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

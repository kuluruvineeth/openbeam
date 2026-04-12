import { dispatchAction } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { resolvePendingAction } from "../lib/pending-actions";

export async function handleConfirmation(
  message: UnifiedMessage,
  identity: ResolvedIdentity,
  pendingId: string
): Promise<BotResponse> {
  const action = await resolvePendingAction(
    message.platform,
    identity.userId,
    pendingId
  );

  if (!action) {
    return {
      type: "text",
      text: "This action has expired. Please try again.",
    };
  }

  try {
    const result = await dispatchAction({
      teamId: action.teamId,
      userId: action.userId,
      connectorId: action.connectorId,
      actionId: action.actionId,
      params: action.params,
      source: "bot",
    });

    const resultMessage = result.success
      ? `Action "${action.actionId}" completed.`
      : `Action "${action.actionId}" failed: ${result.error ?? "unknown"}`;

    return {
      type: "action_result",
      text: resultMessage,
      actionResult: {
        action: action.actionId,
        success: result.success,
        message: result.success ? "Completed" : (result.error ?? "Failed"),
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      type: "action_result",
      text: `Action failed: ${msg}`,
      actionResult: {
        action: action.actionId,
        success: false,
        message: msg,
      },
    };
  }
}

export function handleCancellation(_pendingId: string): BotResponse {
  return { type: "text", text: "Cancelled." };
}

import type { SlashCommandPayload } from "../interactivity/types";
import { buildConfigureChannelModal } from "./configure-modal";
import type { CommandContext, CommandResult } from "./router";

export async function handleConfigureCommand(
  payload: SlashCommandPayload,
  context: CommandContext
): Promise<CommandResult> {
  if (!context.client) {
    return {
      response_type: "ephemeral",
      text: "Configuration requires an active connection. Please try again.",
    };
  }

  const modal = buildConfigureChannelModal(
    payload.channel_id,
    context.connectorId,
    context.channelConfig
  );

  try {
    await context.client.call("views.open", {
      trigger_id: payload.trigger_id,
      view: modal,
    });

    return {};
  } catch (error) {
    return {
      response_type: "ephemeral",
      text: `Failed to open configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

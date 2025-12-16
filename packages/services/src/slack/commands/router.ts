import type { SlackClient } from "../client";
import type { SlashCommandPayload } from "../interactivity/types";
import { handleAskCommand } from "./ask";
import { handleConfigureCommand } from "./configure";
import type { ChannelConfigSettings } from "./configure-modal";
import { handleHelpCommand } from "./help";
import { handleSearchCommand } from "./search";

export interface CommandContext {
  connectorId: string;
  teamId: string;
  accessControlIds: string[];
  client?: SlackClient;
  channelConfig?: Partial<ChannelConfigSettings>;
}

export interface CommandResult {
  response_type?: "in_channel" | "ephemeral";
  text?: string;
  blocks?: unknown[];
  replace_original?: boolean;
  delete_original?: boolean;
}

type CommandHandler = (
  payload: SlashCommandPayload,
  context: CommandContext
) => Promise<CommandResult>;

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  search: handleSearchCommand,
  ask: handleAskCommand,
  configure: handleConfigureCommand,
  help: handleHelpCommand,
};

const WHITESPACE_PATTERN = /\s+/;

export function routeCommand(
  payload: SlashCommandPayload,
  context: CommandContext
): Promise<CommandResult> {
  const parts = payload.text.trim().split(WHITESPACE_PATTERN);
  const subcommand = parts[0]?.toLowerCase() ?? "";

  const handler = COMMAND_HANDLERS[subcommand];

  if (handler) {
    const modifiedPayload = {
      ...payload,
      text: parts.slice(1).join(" "),
    };
    return handler(modifiedPayload, context);
  }

  if (payload.text.trim()) {
    return handleSearchCommand(payload, context);
  }

  return handleHelpCommand(payload, context);
}

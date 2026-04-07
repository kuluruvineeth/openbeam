import type { BotResponse } from "@openbeam/types/bot";

const HELP_TEXT = [
  "*OpenBeam Bot Commands*",
  "",
  "`search <query>` — Search across all connected data sources",
  "`ask <question>` — Get an AI-powered answer with citations",
  "`expert <topic>` — Find topic experts in your organization",
  "`action <connectorId> <actionId> {params}` — Execute a connector action",
  "`help` — Show this help message",
  "",
  "You can also mention me or send a direct message with any question.",
].join("\n");

export function handleHelp(): BotResponse {
  return {
    type: "text",
    text: HELP_TEXT,
  };
}

import type { BotResponse } from "@openbeam/types/bot";

const COMMANDS = [
  { name: "search <query>", desc: "Search across all connected data sources" },
  { name: "ask <question>", desc: "Get an AI-powered answer with citations" },
  { name: "expert <topic>", desc: "Find topic experts in your organization" },
  {
    name: "action <connectorId> <actionId> {params}",
    desc: "Execute a connector action",
  },
  { name: "help", desc: "Show this help message" },
];

const HELP_TEXT = [
  "OpenBeam Bot Commands",
  "",
  ...COMMANDS.map((c) => `${c.name} — ${c.desc}`),
  "",
  "You can also mention me or send a direct message with any question.",
].join("\n");

export function handleHelp(): BotResponse {
  return {
    type: "text",
    text: HELP_TEXT,
  };
}

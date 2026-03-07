import type { SlashCommandPayload } from "../interactivity/types";
import type { CommandContext, CommandResult } from "./router";

export function handleHelpCommand(
  _payload: SlashCommandPayload,
  _context: CommandContext
): Promise<CommandResult> {
  return Promise.resolve({
    response_type: "ephemeral",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "OpenBeam Commands", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Search and get AI-powered answers from your organization's knowledge base.",
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            "*Available Commands:*",
            "",
            "`/openbeam <query>` - Quick search",
            "`/openbeam search <query>` - Search across all data",
            "`/openbeam ask <question>` - Get an AI-powered answer",
            "`/openbeam configure` - Configure OpenBeam for this channel",
            "`/openbeam help` - Show this help message",
          ].join("\n"),
        },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "💡 *Tip:* You can also @mention OpenBeam in any channel to ask questions directly.",
          },
        ],
      },
    ],
  });
}

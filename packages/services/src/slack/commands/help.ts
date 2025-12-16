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
        text: { type: "plain_text", text: "OpenPlane Commands", emoji: true },
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
            "`/openplane <query>` - Quick search",
            "`/openplane search <query>` - Search across all data",
            "`/openplane ask <question>` - Get an AI-powered answer",
            "`/openplane configure` - Configure OpenPlane for this channel",
            "`/openplane help` - Show this help message",
          ].join("\n"),
        },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "💡 *Tip:* You can also @mention OpenPlane in any channel to ask questions directly.",
          },
        ],
      },
    ],
  });
}

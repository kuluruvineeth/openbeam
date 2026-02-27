import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const voiceSearchTool = defineTool({
  name: "voice_search",
  description: `Start a voice-powered search session using natural language speech.

USE THIS WHEN:
- The user wants to search by speaking instead of typing
- A voice-activated search or command is needed
- The user says "search for..." or "find..."

Initiates a LiveKit voice session in action mode. The agent processes spoken queries,
executes search_hybrid or other tools as needed, and responds with synthesized speech.`,

  category: "voice",
  requiredPermissions: ["voice:use", "search:read"],
  searchKeywords: [
    "voice",
    "search",
    "speak",
    "ask",
    "query",
    "find",
    "verbal",
  ],

  parameters: z.object({
    initialQuery: z
      .string()
      .optional()
      .describe("Pre-populated query to search for immediately"),
    conversational: z
      .boolean()
      .optional()
      .default(true)
      .describe("Enable multi-turn conversational follow-ups"),
  }),

  async execute(params, ctx) {
    if (!ctx.services?.voice) {
      return failure(
        "INVALID_STATE",
        "Voice service not available. Ensure LiveKit is configured."
      );
    }

    const session = await ctx.services.voice.startAction({
      userId: ctx.userId,
      teamId: ctx.teamId,
      initialQuery: params.initialQuery,
      conversational: params.conversational,
    });

    return success({
      sessionId: session.id,
      roomName: session.roomName,
      mode: "action",
      conversational: params.conversational,
    });
  },
});

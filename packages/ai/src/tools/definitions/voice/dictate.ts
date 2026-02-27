import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const voiceDictateTool = defineTool({
  name: "voice_dictate",
  description: `Start a voice dictation session that converts speech to text in real-time.

USE THIS WHEN:
- The user wants to dictate text hands-free
- The user asks to type or input text using their voice
- A voice-to-text transcription is needed

The tool initiates a LiveKit voice session in dictation mode. The transcribed text
is delivered as streaming events. Use voice_note to save the resulting text.`,

  category: "voice",
  requiredPermissions: ["voice:use"],
  searchKeywords: [
    "voice",
    "dictate",
    "dictation",
    "speech",
    "transcribe",
    "speak",
    "microphone",
  ],

  parameters: z.object({
    targetField: z
      .string()
      .optional()
      .describe(
        "The UI field to direct transcribed text into (e.g., 'search', 'chat', 'note')"
      ),
    language: z
      .string()
      .optional()
      .default("en")
      .describe("BCP-47 language code for transcription"),
    formatting: z
      .boolean()
      .optional()
      .default(true)
      .describe("Apply intelligent punctuation and formatting to output"),
  }),

  async execute(params, ctx) {
    if (!ctx.services?.voice) {
      return failure(
        "INVALID_STATE",
        "Voice service not available. Ensure LiveKit is configured."
      );
    }

    const session = await ctx.services.voice.startDictation({
      userId: ctx.userId,
      teamId: ctx.teamId,
      targetField: params.targetField,
      language: params.language,
      formatting: params.formatting,
    });

    return success({
      sessionId: session.id,
      roomName: session.roomName,
      mode: "dictation",
      targetField: params.targetField,
    });
  },
});

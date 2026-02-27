import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const voiceNoteTool = defineTool({
  name: "voice_note",
  description: `Create, list, or retrieve voice notes — short transcribed recordings.

USE THIS WHEN:
- The user wants to save a voice dictation as a note
- The user asks to see their voice notes
- A quick capture of spoken thoughts is needed

Voice notes are lightweight entries with a title, transcribed content, and
optional duration metadata. They can be searched alongside other documents.`,

  category: "voice",
  requiredPermissions: ["voice:use"],
  searchKeywords: [
    "voice",
    "note",
    "memo",
    "recording",
    "capture",
    "save",
    "transcription",
  ],

  parameters: z.object({
    action: z
      .enum(["create", "list", "get"])
      .describe("The operation to perform on voice notes"),
    title: z
      .string()
      .optional()
      .describe("Title for the note (required for create)"),
    content: z
      .string()
      .optional()
      .describe("Transcribed content (required for create)"),
    durationSeconds: z
      .number()
      .optional()
      .describe("Duration of the recording in seconds"),
    noteId: z.string().optional().describe("Note ID (required for get)"),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Max notes to return for list action"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ReturnType<typeof success> | ReturnType<typeof failure>> {
    if (!ctx.services?.voice) {
      return failure("INVALID_STATE", "Voice service not available.");
    }

    switch (params.action) {
      case "create": {
        if (!(params.title && params.content)) {
          return failure(
            "INVALID_INPUT",
            "Title and content are required to create a voice note."
          );
        }
        const note = await ctx.services.voice.createNote({
          userId: ctx.userId,
          teamId: ctx.teamId,
          title: params.title,
          content: params.content,
          durationSeconds: params.durationSeconds,
        });
        return success({ id: note.id, title: note.title, created: true });
      }

      case "list": {
        const notes = await ctx.services.voice.listNotes({
          userId: ctx.userId,
          teamId: ctx.teamId,
          limit: params.limit,
        });
        return success({
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            createdAt: n.createdAt,
          })),
          count: notes.length,
        });
      }

      case "get": {
        if (!params.noteId) {
          return failure(
            "INVALID_INPUT",
            "noteId is required for the get action."
          );
        }
        const note = await ctx.services.voice.getNote({
          noteId: params.noteId,
          userId: ctx.userId,
        });
        if (!note) {
          return failure("NOT_FOUND", "Voice note not found.");
        }
        return success(note);
      }

      default:
        return failure("INVALID_INPUT", `Unknown action: ${params.action}`);
    }
  },
});

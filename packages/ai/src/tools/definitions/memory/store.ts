import { z } from "zod";
import type { PersistentMemory } from "../../../memory/persistent";
import { defineTool, failure, success } from "../../builder";
import { getPersistentMemory, setPersistentMemory } from "./deps";

export function setPersistentMemoryForStore(store: PersistentMemory): void {
  setPersistentMemory(store);
}

export const memoryStoreTool = defineTool({
  name: "memory_store",
  description: `Store information in persistent memory for future recall across sessions.

USE THIS WHEN:
- You learn a new fact, preference, or decision from the user
- Important context should be remembered for future conversations
- A key decision or action item should be tracked long-term

DO NOT USE WHEN:
- Storing temporary session data (use getSessionState instead)
- The information is already in connected data sources

HOW TO USE:
- Provide clear, concise content describing what to remember
- Add relevant tags for categorization and future retrieval
- Set importance level based on how critical the information is`,

  category: "data",
  requiredPermissions: ["memory:write"],
  searchKeywords: [
    "memory",
    "store",
    "remember",
    "save",
    "persist",
    "learn",
    "fact",
  ],

  parameters: z.object({
    content: z.string().describe("The information to store in memory"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for categorizing the memory entry"),
    source: z
      .string()
      .optional()
      .describe("Source of the information (e.g., 'user', 'agent', 'tool')"),
    importance: z
      .enum(["low", "medium", "high"])
      .optional()
      .default("medium")
      .describe("How important this information is for future recall"),
  }),

  async execute(params, _ctx) {
    const persistentMemory = getPersistentMemory();
    if (!persistentMemory) {
      return failure(
        "INVALID_STATE",
        "Persistent memory not initialized. Call setPersistentMemoryForStore before using this tool.",
        { suggestion: "Initialize persistent memory in your application setup" }
      );
    }

    const id = await persistentMemory.store({
      content: params.content,
      tags: params.tags,
      source: params.source,
      importance: params.importance,
    });

    return success({
      id,
      stored: true,
      content: params.content,
      tags: params.tags ?? [],
      importance: params.importance,
    });
  },
});

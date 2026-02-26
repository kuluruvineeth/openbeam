import { z } from "zod";
import type { PersistentMemory } from "../../../memory/persistent";
import { defineTool, failure, success } from "../../builder";
import { getPersistentMemory, setPersistentMemory } from "./deps";

export function setPersistentMemoryForForget(store: PersistentMemory): void {
  setPersistentMemory(store);
}

export const memoryForgetTool = defineTool({
  name: "memory_forget",
  description: `Delete specific memory entries or bulk-delete by query/tags. Supports GDPR-compliant data removal.

USE THIS WHEN:
- The user requests deletion of specific stored information
- Removing outdated or incorrect memories
- GDPR compliance: user requests their data be forgotten
- Cleaning up irrelevant stored context

DO NOT USE WHEN:
- You want to update a memory (store a new version instead)
- Clearing temporary session state (use getSessionState delete action)

HOW TO USE:
- Provide a specific memory ID to delete a single entry
- Provide a query to find and delete matching entries
- Provide tags to delete all entries with those tags
- Use query + limit to control how many entries are deleted`,

  category: "data",
  requiredPermissions: ["memory:write", "memory:delete"],
  searchKeywords: [
    "memory",
    "forget",
    "delete",
    "remove",
    "gdpr",
    "erase",
    "clear",
  ],
  stakes: "medium",
  reversibility: "irreversible",

  parameters: z.object({
    id: z.string().optional().describe("Specific memory entry ID to delete"),
    query: z
      .string()
      .optional()
      .describe("Search query to find entries to delete"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Delete all entries matching these tags"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of entries to delete when using query/tags"),
  }),

  async execute(params, _ctx) {
    const persistentMemory = getPersistentMemory();
    if (!persistentMemory) {
      return failure(
        "INVALID_STATE",
        "Persistent memory not initialized. Call setPersistentMemoryForForget before using this tool.",
        { suggestion: "Initialize persistent memory in your application setup" }
      );
    }

    if (!(params.id || params.query || params.tags?.length)) {
      return failure(
        "INVALID_INPUT",
        "Provide at least one of: id, query, or tags to identify entries to forget"
      );
    }

    if (params.id) {
      const deleted = await persistentMemory.forget(params.id);
      return success({
        deleted: deleted ? 1 : 0,
        ids: deleted ? [params.id] : [],
      });
    }

    const deletedCount = await persistentMemory.forgetByQuery({
      query: params.query,
      tags: params.tags,
      limit: Math.min(Math.max(1, params.limit), 100),
    });

    return success({
      deleted: deletedCount,
      ids: [] as string[],
    });
  },
});

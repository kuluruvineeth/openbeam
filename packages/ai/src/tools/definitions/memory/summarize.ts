import { z } from "zod";
import type { SessionMemoryStore } from "../../../memory/session";
import type { SummarizerDeps } from "../../../memory/summarizer";
import { summarizeMessages } from "../../../memory/summarizer";
import { defineTool, failure, success } from "../../builder";
import {
  getSessionMemory,
  getSummarizerDeps,
  setSessionMemoryDep,
  setSummarizerDepInternal,
} from "./deps";

export function setSessionMemoryForSummarize(store: SessionMemoryStore): void {
  setSessionMemoryDep(store);
}

export function setSummarizerDeps(deps: SummarizerDeps): void {
  setSummarizerDepInternal(deps);
}

export const memorySummarizeTool = defineTool({
  name: "memory_summarize",
  description: `Summarize the current session's conversation history, extracting key facts, decisions, and action items.

USE THIS WHEN:
- The conversation has been long and you need a recap
- You want to extract and store key decisions for future reference
- Before ending a session to capture important context
- When the user asks for a summary of the discussion

DO NOT USE WHEN:
- The conversation is short (< 5 messages)
- Summarizing external documents (use RAG tools instead)

HOW TO USE:
- Optionally specify a limit on how many recent messages to summarize
- The summary extracts structured information: key facts, decisions, action items
- Results include token savings from the summarization`,

  category: "data",
  requiredPermissions: ["memory:read", "session:read"],
  searchKeywords: [
    "summarize",
    "summary",
    "recap",
    "digest",
    "extract",
    "conversation",
  ],

  parameters: z.object({
    messageLimit: z
      .number()
      .optional()
      .describe("Maximum number of recent messages to summarize"),
    storeSummary: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to store the summary back in session memory"),
  }),

  async execute(params, _ctx) {
    const sessionMemoryStore = getSessionMemory();
    if (!sessionMemoryStore) {
      return failure(
        "INVALID_STATE",
        "Session memory not initialized. Call setSessionMemoryForSummarize before using this tool.",
        { suggestion: "Initialize session memory in your application setup" }
      );
    }

    const summarizerDeps = getSummarizerDeps();
    if (!summarizerDeps) {
      return failure(
        "INVALID_STATE",
        "Summarizer not configured. Call setSummarizerDeps before using this tool.",
        { suggestion: "Provide a generateSummary function" }
      );
    }

    const messages = await sessionMemoryStore.getMessages(params.messageLimit);

    if (messages.length === 0) {
      return success({
        summary: "",
        keyFacts: [],
        decisions: [],
        actionItems: [],
        messagesCovered: 0,
        tokensSaved: 0,
      });
    }

    const result = await summarizeMessages(messages, summarizerDeps);

    if (params.storeSummary) {
      await sessionMemoryStore.setSummary(result.summary);
    }

    return success(result);
  },
});

import {
  GenerateL0InputSchema,
  GenerateL1InputSchema,
} from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { GenerateL0Output, GenerateL1Output } from "./types";

const SHORT_CONTENT_THRESHOLD = 200;
const CONTENT_TRUNCATION_LIMIT = 4000;
const L0_MAX_TOKENS = 100;
const L1_MAX_TOKENS = 2000;

export interface GenerateAbstractsDependencies {
  completionService: {
    complete(
      messages: Array<{ role: string; content: string }>,
      options?: { maxTokens?: number }
    ): Promise<{ content: string }>;
  };
}

export function createGenerateAbstractsActivity(
  deps: GenerateAbstractsDependencies
) {
  return {
    async generateL0Abstract(rawInput: unknown): Promise<GenerateL0Output> {
      const input = GenerateL0InputSchema.parse(rawInput);

      Context.current().heartbeat({ stage: "generating-l0", uri: input.uri });

      if (input.content.length <= SHORT_CONTENT_THRESHOLD) {
        return { abstract: input.content };
      }

      const result = await deps.completionService.complete(
        [
          {
            role: "system",
            content:
              "Summarize the following content in one concise sentence. Return only the summary, nothing else.",
          },
          {
            role: "user",
            content: input.content.slice(0, CONTENT_TRUNCATION_LIMIT),
          },
        ],
        { maxTokens: L0_MAX_TOKENS }
      );

      return { abstract: result.content.trim() };
    },

    async generateL1Overview(rawInput: unknown): Promise<GenerateL1Output> {
      const input = GenerateL1InputSchema.parse(rawInput);

      Context.current().heartbeat({ stage: "generating-l1", uri: input.uri });

      const result = await deps.completionService.complete(
        [
          {
            role: "system",
            content:
              "Create a detailed overview of the following content in 500-2000 tokens. Include key concepts, structure, and important details. Return only the overview, nothing else.",
          },
          {
            role: "user",
            content: input.content.slice(0, CONTENT_TRUNCATION_LIMIT * 4),
          },
        ],
        { maxTokens: L1_MAX_TOKENS }
      );

      return { overview: result.content.trim() };
    },
  };
}

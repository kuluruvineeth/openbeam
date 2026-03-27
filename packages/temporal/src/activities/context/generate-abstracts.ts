import {
  GenerateL0InputSchema,
  GenerateL1InputSchema,
} from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { GenerateL0Output, GenerateL1Output } from "./types";

const MAX_ABSTRACT_LENGTH = 200;
const MAX_OVERVIEW_LENGTH = 2000;

export interface GenerateAbstractsDependencies {
  db: unknown;
}

export function createGenerateAbstractsActivity(
  _deps: GenerateAbstractsDependencies
) {
  return {
    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async generateL0Abstract(rawInput: unknown): Promise<GenerateL0Output> {
      const input = GenerateL0InputSchema.parse(rawInput);

      Context.current().heartbeat({ stage: "generating-l0", uri: input.uri });

      const abstract =
        input.content.length <= MAX_ABSTRACT_LENGTH
          ? input.content
          : `${input.content.slice(0, MAX_ABSTRACT_LENGTH - 3)}...`;

      return { abstract };
    },

    // biome-ignore lint/suspicious/useAwait: Temporal activities must be async per interface contract
    async generateL1Overview(rawInput: unknown): Promise<GenerateL1Output> {
      const input = GenerateL1InputSchema.parse(rawInput);

      Context.current().heartbeat({ stage: "generating-l1", uri: input.uri });

      const lines = input.content
        .split("\n")
        .filter((l) => l.trim().length > 0);
      const overview = lines
        .slice(0, 20)
        .join("\n")
        .slice(0, MAX_OVERVIEW_LENGTH);

      return { overview };
    },
  };
}

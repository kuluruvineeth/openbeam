import type { Database } from "@openbeam/db";
import { createEmbedContextActivity } from "./embed-context";
import { createExtractMemoriesActivity } from "./extract-memories";
import { createGenerateAbstractsActivity } from "./generate-abstracts";
import type { ContextEnrichmentActivities } from "./types";

export interface ContextActivityDependencies {
  db: Database;
}

export function createContextEnrichmentActivities(
  deps: ContextActivityDependencies
): ContextEnrichmentActivities {
  const abstracts = createGenerateAbstractsActivity({ db: deps.db });
  const embed = createEmbedContextActivity({ db: deps.db });
  const memories = createExtractMemoriesActivity({ db: deps.db });

  return {
    generateL0Abstract: abstracts.generateL0Abstract,
    generateL1Overview: abstracts.generateL1Overview,
    embedContextEntry: embed.embedContextEntry,
    extractMemoriesFromSession: memories.extractMemoriesFromSession,
  };
}

export {
  createEmbedContextActivity,
  type EmbedContextDependencies,
} from "./embed-context";
export {
  createExtractMemoriesActivity,
  type ExtractMemoriesDependencies,
} from "./extract-memories";
export {
  createGenerateAbstractsActivity,
  type GenerateAbstractsDependencies,
} from "./generate-abstracts";
export type {
  ContextEnrichmentActivities,
  EmbedContextOutput,
  GenerateL0Output,
  GenerateL1Output,
  MemoryExtractionResult,
} from "./types";

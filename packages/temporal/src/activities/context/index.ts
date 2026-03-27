import type { Database } from "@openbeam/db";
import { createEmbedContextActivity } from "./embed-context";
import { createExtractMemoriesActivity } from "./extract-memories";
import { createExtractRelationsActivity } from "./extract-relations";
import { createGenerateAbstractsActivity } from "./generate-abstracts";
import { createIngestFromSyncActivity } from "./ingest-from-sync";
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
  const ingest = createIngestFromSyncActivity({ db: deps.db });
  const relations = createExtractRelationsActivity({ db: deps.db });

  return {
    generateL0Abstract: abstracts.generateL0Abstract,
    generateL1Overview: abstracts.generateL1Overview,
    embedContextEntry: embed.embedContextEntry,
    extractMemoriesFromSession: memories.extractMemoriesFromSession,
    ingestSyncBatchToContext: ingest.ingestSyncBatchToContext,
    extractRelationsFromDocuments: relations.extractRelationsFromDocuments,
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
  createExtractRelationsActivity,
  type ExtractRelationsDependencies,
} from "./extract-relations";
export {
  createGenerateAbstractsActivity,
  type GenerateAbstractsDependencies,
} from "./generate-abstracts";
export {
  createIngestFromSyncActivity,
  type IngestFromSyncDependencies,
} from "./ingest-from-sync";
export type {
  ContextEnrichmentActivities,
  EmbedContextOutput,
  ExtractRelationsOutput,
  GenerateL0Output,
  GenerateL1Output,
  IngestSyncBatchOutput,
  MemoryExtractionResult,
} from "./types";

import { createChunkActivity } from "./chunk";
import { createEmbedActivity, createSingleEmbedActivity } from "./embed";
import { createExtractEntitiesActivity } from "./extract";
import { createParseActivity } from "./parse";
import { createRerankActivity } from "./rerank";
import type { EngineActivityDependencies } from "./shared";
import type { EngineActivities } from "./types";

export type { EngineActivityDependencies };

export function createEngineActivities(
  deps: EngineActivityDependencies = {}
): EngineActivities {
  return {
    parse: createParseActivity(deps),
    chunk: createChunkActivity(deps),
    generateEmbeddings: createEmbedActivity(deps),
    generateSingleEmbedding: createSingleEmbedActivity(deps),
    rerank: createRerankActivity(deps),
    extractEntities: createExtractEntitiesActivity(deps),
  };
}

export type {
  ChunkInput,
  ChunkResult,
  EmbeddingInput,
  EmbeddingResult,
  EngineActivities,
  ExtractEntitiesInput,
  ExtractEntitiesResult,
  ParseInput,
  ParseResult,
  RerankInput,
  RerankResult,
  SingleEmbeddingInput,
  SingleEmbeddingResult,
} from "./types";

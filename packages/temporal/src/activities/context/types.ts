import type {
  EmbedContextInput,
  ExtractMemoriesInput,
  ExtractRelationsInput,
  GenerateL0Input,
  GenerateL1Input,
  IngestSyncBatchInput,
} from "@openbeam/types/temporal/workflows/context";

export interface GenerateL0Output {
  abstract: string;
}

export interface GenerateL1Output {
  overview: string;
}

export interface EmbedContextOutput {
  indexed: boolean;
}

export interface MemoryExtractionResult {
  memoriesCreated: number;
  memoriesMerged: number;
  memoriesSkipped: number;
  categories: Record<string, number>;
}

export interface IngestSyncBatchOutput {
  created: number;
  updated: number;
}

export interface ExtractRelationsOutput {
  relationsCreated: number;
}

export interface ContextEnrichmentActivities {
  generateL0Abstract(input: GenerateL0Input): Promise<GenerateL0Output>;
  generateL1Overview(input: GenerateL1Input): Promise<GenerateL1Output>;
  embedContextEntry(input: EmbedContextInput): Promise<EmbedContextOutput>;
  extractMemoriesFromSession(
    input: ExtractMemoriesInput
  ): Promise<MemoryExtractionResult>;
  ingestSyncBatchToContext(
    input: IngestSyncBatchInput
  ): Promise<IngestSyncBatchOutput>;
  extractRelationsFromDocuments(
    input: ExtractRelationsInput
  ): Promise<ExtractRelationsOutput>;
}

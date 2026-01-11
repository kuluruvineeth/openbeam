import type { GenericDocument } from "@openplane/vespa";

export type {
  OverviewCitation,
  OverviewRequest,
  OverviewResponse,
  OverviewStreamChunk,
  OverviewStreamChunkType,
  OverviewTiming,
  OverviewToolCallData,
  OverviewToolResultData,
  OverviewUsage,
} from "@openplane/types/overview";

export interface FanoutQuery {
  query: string;
  intent: "original" | "expanded" | "related";
  weight: number;
}

export interface ContextDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  connectorType?: string;
  sourceType?: "document" | "media";
  score: number;
  chunks: ContextChunk[];
}

export interface ContextChunk {
  text: string;
  startOffset: number;
  endOffset: number;
  score: number;
}

export interface BuiltContext {
  text: string;
  documents: ContextDocument[];
  tokenCount: number;
  truncated: boolean;
}

export interface CitationMatch {
  index: number;
  documentId: string;
  startPosition: number;
  endPosition: number;
}

export interface RetrievalResult {
  documents: GenericDocument[];
  scores: Map<string, number>;
  queryTime: number;
}

export interface OverviewConfig {
  maxSources: number;
  maxTokens: number;
  enableFanout: boolean;
  fanoutQueries: number;
  diversityWeight: number;
  minRelevanceScore: number;
  enableSemanticCache: boolean;
  semanticCacheThreshold: number;
  enableSearchCache: boolean;
  enableModelRouting: boolean;
}

export const DEFAULT_OVERVIEW_CONFIG: OverviewConfig = {
  maxSources: 8,
  maxTokens: 6000,
  enableFanout: true,
  fanoutQueries: 3,
  diversityWeight: 0.3,
  minRelevanceScore: 0.3,
  enableSemanticCache: true,
  semanticCacheThreshold: 0.75,
  enableSearchCache: true,
  enableModelRouting: true,
};

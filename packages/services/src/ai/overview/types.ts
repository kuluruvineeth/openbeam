import type { GenericDocument } from "@openplane/vespa";

export interface OverviewRequest {
  query: string;
  teamId: string;
  userId?: string;
  accessControlIds?: string[];
  maxSources?: number;
  enableFanout?: boolean;
  modelId?: string;
  temperature?: number;
}

export interface OverviewCitation {
  index: number;
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  connectorType?: string;
  sourceType?: "document" | "media";
  relevanceScore: number;
}

export interface OverviewTiming {
  fanoutMs: number;
  retrievalMs: number;
  contextBuildMs: number;
  generationMs: number;
  totalMs: number;
  firstTokenMs: number | null;
}

export interface OverviewResponse {
  content: string;
  citations: OverviewCitation[];
  groundingScore: number | null;
  timing: OverviewTiming;
  usage: OverviewUsage;
}

export interface OverviewUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type OverviewStreamChunkType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "text"
  | "citation"
  | "done"
  | "error";

export interface OverviewToolCallData {
  toolCallId: string;
  toolName: string;
  toolInput?: unknown;
}

export interface OverviewToolResultData {
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
}

export interface OverviewStreamChunk {
  type: OverviewStreamChunkType;
  content?: string;
  citation?: OverviewCitation;
  usage?: OverviewUsage;
  timing?: OverviewTiming;
  groundingScore?: number;
  error?: string;
  toolCall?: OverviewToolCallData;
  toolResult?: OverviewToolResultData;
}

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
}

export const DEFAULT_OVERVIEW_CONFIG: OverviewConfig = {
  maxSources: 8,
  maxTokens: 6000,
  enableFanout: true,
  fanoutQueries: 3,
  diversityWeight: 0.3,
  minRelevanceScore: 0.3,
};

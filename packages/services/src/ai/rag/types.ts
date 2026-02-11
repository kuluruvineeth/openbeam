export const DEFAULT_RAG_MODEL = "gemini-3-flash-preview";

export type QueryIntent =
  | "question"
  | "search"
  | "clarification"
  | "followup"
  | "command";

export interface QueryAnalysis {
  originalQuery: string;
  normalizedQuery: string;
  intent: QueryIntent;
  subQueries: string[];
  entities: ExtractedEntity[];
  temporalContext: TemporalContext | null;
  requiresContext: boolean;
  confidence: number;
}

export interface ExtractedEntity {
  text: string;
  type: "person" | "project" | "team" | "technology" | "document";
  confidence: number;
}

export interface TemporalContext {
  type: "absolute" | "relative";
  start?: Date;
  end?: Date;
  description: string;
}

export interface ConversationContext {
  conversationId: string;
  previousMessages: ConversationMessage[];
  summary: string | null;
  entities: Map<string, ExtractedEntity>;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface RAGRequest {
  query: string;
  teamId: string;
  userId: string;
  conversationId?: string;
  conversationContext?: ConversationContext;
  accessControlIds?: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  includeMedia?: boolean;
  sourceId?: string;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  connectorType: string;
  content: string;
  startOffset: number;
  endOffset: number;
  score: number;
  tokenCount: number;
}

export interface RAGCitation {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  connectorType: string;
  snippet: string;
  relevanceScore: number;
  position: number;
}

export interface GroundingResult {
  claims: ClaimVerification[];
  overallScore: number;
  confidence: GroundingConfidence;
}

export type GroundingConfidence = "high" | "medium" | "low" | "uncertain";

export interface ClaimVerification {
  claim: string;
  supported: boolean;
  evidenceChunkId: string | null;
  evidenceSnippet: string | null;
  confidence: number;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  grounding: GroundingResult | null;
  conversationId: string | null;
  usage: TokenUsage;
  timing: RAGTiming;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RAGTiming {
  analysisMs: number;
  retrievalMs: number;
  chunkingMs: number;
  generationMs: number;
  groundingMs: number;
  totalMs: number;
  firstTokenMs: number | null;
}

export type RAGStreamChunkType =
  | "context"
  | "text"
  | "citation"
  | "grounding"
  | "done"
  | "error";

export interface RAGStreamChunk {
  type: RAGStreamChunkType;
  content?: string;
  citation?: RAGCitation;
  grounding?: GroundingResult;
  usage?: TokenUsage;
  error?: string;
}

export interface AssembledContext {
  systemPrompt: string;
  contextText: string;
  chunks: RAGChunk[];
  totalTokens: number;
  truncated: boolean;
  citationMap: Map<string, RAGCitation>;
}

export interface ContextAssemblyConfig {
  maxContextTokens: number;
  reserveAnswerTokens: number;
  includeMetadata: boolean;
  hierarchical: boolean;
}

export interface ChunkExtractionOptions {
  maxChunksPerDoc: number;
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
}

export interface RAGOrchestratorConfig {
  enableCache: boolean;
  enableGrounding: boolean;
  enablePersonalization: boolean;
  maxChunks: number;
  diversityWeight: number;
  streamFirstToken: boolean;
}

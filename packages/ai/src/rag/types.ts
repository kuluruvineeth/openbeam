export type QueryIntent =
  | "question"
  | "search"
  | "clarification"
  | "followup"
  | "command"
  | "comparison"
  | "definition"
  | "howto";

export type EntityType =
  | "person"
  | "organization"
  | "project"
  | "technology"
  | "document"
  | "location"
  | "date"
  | "product";

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  confidence: number;
  normalized?: string;
}

export interface TemporalContext {
  type: "absolute" | "relative";
  start?: Date;
  end?: Date;
  description: string;
}

export interface QueryAnalysis {
  originalQuery: string;
  normalizedQuery: string;
  intent: QueryIntent;
  subQueries: string[];
  entities: ExtractedEntity[];
  temporalContext: TemporalContext | null;
  requiresContext: boolean;
  confidence: number;
  keywords: string[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  citations?: RAGCitation[];
}

export interface ConversationContext {
  conversationId: string;
  turns: ConversationTurn[];
  summary: string | null;
  entities: Map<string, ExtractedEntity>;
  topicShift: boolean;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  sourceType: string;
  content: string;
  startOffset: number;
  endOffset: number;
  score: number;
  tokenCount: number;
  metadata?: Record<string, unknown>;
  sectionId?: string;
  sectionTitle?: string;
  sectionPath?: string[];
  sectionLevel?: number;
  pageNumber?: number;
  pageRange?: [number, number];
  elementTypes?: string[];
}

export interface RAGCitation {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  sourceType: string;
  snippet: string;
  relevanceScore: number;
  position: number;
  pageNumber?: number;
  pageRange?: [number, number];
  sectionPath?: string[];
  sectionTitle?: string;
}

export type GroundingConfidence = "high" | "medium" | "low" | "uncertain";

export interface ClaimVerification {
  claim: string;
  supported: boolean;
  evidenceChunkId: string | null;
  evidenceSnippet: string | null;
  confidence: number;
}

export interface GroundingResult {
  claims: ClaimVerification[];
  overallScore: number;
  confidence: GroundingConfidence;
  unsupportedClaims: string[];
}

export interface Citation {
  documentId: string;
  chunkId: string;
  text: string;
  relevanceScore: number;
  documentTitle?: string;
  documentUrl?: string;
  pageNumber?: number;
}

export interface GroundedAnswer {
  answer: string;
  citations: Citation[];
  groundingScore: number;
  confidence: number;
  ungroundedClaims: string[];
  suggestedFollowUp?: string;
}

export interface RAGContext {
  systemPrompt: string;
  contextText: string;
  chunks: RAGChunk[];
  totalTokens: number;
  truncated: boolean;
  citationMap: Map<string, RAGCitation>;
}

export interface RAGTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

export interface RAGTiming {
  analysisMs: number;
  retrievalMs: number;
  rerankingMs: number;
  generationMs: number;
  groundingMs: number;
  totalMs: number;
  firstTokenMs: number | null;
}

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  grounding: GroundingResult | null;
  usage: RAGTokenUsage;
  timing: RAGTiming;
  confidence: GroundingConfidence;
  followUpQuestions?: string[];
}

export type RAGStreamEventType =
  | "analysis"
  | "retrieval"
  | "context"
  | "text"
  | "citation"
  | "grounding"
  | "done"
  | "error";

export interface RAGStreamEvent {
  type: RAGStreamEventType;
  content?: string;
  citation?: RAGCitation;
  grounding?: GroundingResult;
  analysis?: QueryAnalysis;
  usage?: RAGTokenUsage;
  error?: string;
}

export interface RAGConfig {
  maxChunks: number;
  maxContextTokens: number;
  reserveAnswerTokens: number;
  diversityWeight: number;
  groundingThreshold: number;
  includeMetadata: boolean;
  citationStyle: "inline" | "footnote" | "endnote";
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  maxChunks: 20,
  maxContextTokens: 8000,
  reserveAnswerTokens: 2000,
  diversityWeight: 0.3,
  groundingThreshold: 0.5,
  includeMetadata: true,
  citationStyle: "inline",
};

export interface ChunkingOptions {
  maxChunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
  splitOn: "sentence" | "paragraph" | "token";
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  maxChunkSize: 512,
  chunkOverlap: 50,
  minChunkSize: 100,
  splitOn: "sentence",
};

export interface RerankingOptions {
  model?: string;
  topK: number;
  diversityWeight: number;
  minScore: number;
}

export const DEFAULT_RERANKING_OPTIONS: RerankingOptions = {
  topK: 10,
  diversityWeight: 0.3,
  minScore: 0.1,
};

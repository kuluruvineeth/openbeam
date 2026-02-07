export type ParserStrategy = "fast" | "hi_res" | "ocr_only" | "auto";

export interface DocumentElement {
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
  pageNumber?: number;
}

export interface DocumentChunk {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
  pageNumber?: number;
  pageEnd?: number;
}

export interface ParseInput {
  url: string;
  filename?: string;
  strategy?: ParserStrategy;
}

export interface ParseResult {
  filename: string;
  mimeType: string | null;
  elements: DocumentElement[];
  chunks?: DocumentChunk[] | string[];
  metadata: Record<string, unknown>;
  textLength: number;
  pageCount: number | null;
}

export interface ChunkInput {
  text: string;
  maxCharacters?: number;
  overlap?: number;
}

export interface ChunkResult {
  chunks: DocumentChunk[];
  totalChunks: number;
  totalCharacters: number;
}

export interface EmbeddingInput {
  texts: string[];
  returnSparse?: boolean;
  maxLength?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
  sparseEmbeddings?: Record<string, number>[];
  model: string;
  usage: {
    totalTokens: number;
    latencyMs: number;
  };
}

export interface SingleEmbeddingInput {
  text: string;
  maxLength?: number;
  returnSparse?: boolean;
}

export interface SingleEmbeddingResult {
  dense: number[];
  sparse?: Record<string, number>;
}

export interface RerankInput {
  query: string;
  passages: string[];
  topK?: number;
}

export interface RerankResultItem {
  index: number;
  score: number;
  passage: string;
}

export interface RerankResult {
  results: RerankResultItem[];
  model: string;
  usage: {
    latencyMs: number;
  };
}

export interface ExtractedEntity {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
  source: string;
}

export interface ExtractEntitiesInput {
  text: string;
  labels?: string[];
  threshold?: number;
}

export interface ExtractEntitiesResult {
  entities: ExtractedEntity[];
  model: string;
  usage: {
    latencyMs: number;
  };
}

export interface EngineActivities {
  parse(input: ParseInput): Promise<ParseResult>;
  chunk(input: ChunkInput): Promise<ChunkResult>;
  generateEmbeddings(input: EmbeddingInput): Promise<EmbeddingResult>;
  generateSingleEmbedding(
    input: SingleEmbeddingInput
  ): Promise<SingleEmbeddingResult>;
  rerank(input: RerankInput): Promise<RerankResult>;
  extractEntities(input: ExtractEntitiesInput): Promise<ExtractEntitiesResult>;
}

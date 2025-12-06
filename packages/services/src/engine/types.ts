export interface DocumentElement {
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ParseResponse {
  filename: string;
  mime_type: string | null;
  elements: DocumentElement[];
  chunks: string[] | null;
  metadata: Record<string, unknown>;
  text_length: number;
  page_count: number | null;
}

export interface DocumentChunk {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
}

export interface ChunkResponse {
  chunks: DocumentChunk[];
  total_chunks: number;
  total_characters: number;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ParseOptions {
  chunk?: boolean;
  maxChunkSize?: number;
  overlap?: number;
}

export interface ChunkOptions {
  maxCharacters?: number;
  overlap?: number;
}

export interface ParserInfo {
  name: string;
  mimes: string[];
  extensions: string[];
}

export interface SupportedTypesResponse {
  mimes: string[];
  extensions: string[];
  parsers: ParserInfo[];
}

export interface EngineClientOptions {
  timeout?: number;
}

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "EngineError";
  }
}

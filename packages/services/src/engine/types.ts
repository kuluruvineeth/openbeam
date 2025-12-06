export interface DocumentElement {
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ParseResponse {
  filename: string;
  mime_type: string | null;
  elements: DocumentElement[];
  chunks: string[] | DocumentChunk[] | null;
  metadata: Record<string, unknown>;
  text_length: number;
  page_count: number | null;
}

export interface DocumentChunk {
  index: number;
  text: string;
  metadata: Record<string, unknown>;
  page_number?: number;
  page_end?: number;
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
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "EngineError";
    this.status = status;
    this.code = code;
  }
}

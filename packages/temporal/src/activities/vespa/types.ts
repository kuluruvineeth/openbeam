import type { GenericDocument } from "@openbeam/vespa";

export interface BulkIndexInput {
  documents: GenericDocument[];
  connectorId: string;
  batchSize?: number;
  concurrency?: number;
}

export interface BulkIndexResult {
  total: number;
  indexed: number;
  failed: number;
  errors: Array<{ docId: string; error: string }>;
  durationMs: number;
}

export interface DeleteDocumentsInput {
  connectorId: string;
  documentIds: string[];
}

export interface DeleteByConnectorInput {
  connectorId: string;
}

export interface DeduplicateInput {
  documents: GenericDocument[];
}

export interface SearchInput {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  connectorTypes?: string[];
}

export interface SearchHit {
  id: string;
  relevance: number;
  fields: GenericDocument;
}

export interface SearchResult {
  hits: SearchHit[];
  totalCount: number;
  durationMs: number;
}

export interface RemoveOrphanChunksInput {
  connectorId: string;
}

export interface RemoveOrphanChunksResult {
  removed: number;
  scanned: number;
}

export interface VespaActivities {
  bulkIndex(input: BulkIndexInput): Promise<BulkIndexResult>;
  deleteDocuments(
    input: DeleteDocumentsInput
  ): Promise<{ deleted: number; failed: number }>;
  deleteByConnector(input: DeleteByConnectorInput): Promise<void>;
  deduplicateByChecksum(input: DeduplicateInput): Promise<GenericDocument[]>;
  search(input: SearchInput): Promise<SearchResult>;
  removeOrphanChunks(
    input: RemoveOrphanChunksInput
  ): Promise<RemoveOrphanChunksResult>;
}

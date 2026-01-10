import { z } from "zod";
import type { MediaSearchRanking, SearchRanking } from "./config";
import { RRFConfigSchema, SearchModeSchema } from "./config";

export const SearchFiltersSchema = z.object({
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const HybridSearchRequestSchema = z.object({
  query: z.string().min(1),
  teamId: z.string(),
  userId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  mode: SearchModeSchema.optional(),
  rrfConfig: RRFConfigSchema.optional(),
  filters: SearchFiltersSchema.optional(),
  accessControlIds: z.array(z.string()).optional(),
  experimentId: z.string().optional(),
});

export type HybridSearchRequest = z.infer<typeof HybridSearchRequestSchema>;

export interface SearchParams {
  query: string;
  teamId: string;
  connectorTypes?: string[];
  connectorId?: string;
  documentTypes?: string[];
  authorId?: string;
  authorIds?: string[];
  sourceId?: string;
  sourceIds?: string[];
  sourceTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
  ranking?: SearchRanking;
  accessControlIds?: string[];
}

export interface MediaSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorId?: string;
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: MediaSearchRanking;
  mediaType?: string;
}

export interface UnifiedSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorTypes?: string[];
  connectorId?: string;
  documentTypes?: string[];
  sourceTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  authorIds?: string[];
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: SearchRanking;
  mediaRanking?: MediaSearchRanking;
  includeDocuments?: boolean;
  includeMedia?: boolean;
}

export interface RecentDocumentsParams {
  teamId: string;
  hours?: number;
  limit?: number;
  accessControlIds?: string[];
}

export interface ThreadSearchParams {
  threadId: string;
  teamId: string;
  accessControlIds?: string[];
}

export interface SimilarDocumentsParams {
  documentId: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
}

export interface AuthorSearchParams {
  authorId: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
}

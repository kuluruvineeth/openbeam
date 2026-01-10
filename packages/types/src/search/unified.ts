import type { ConnectorFacet } from "./results";

export interface UnifiedSearchItem {
  type: "document" | "media";
  data: unknown;
  relevance: number;
}

export interface UnifiedSearchResult {
  items: UnifiedSearchItem[];
  documents: unknown[];
  media: unknown[];
  documentTotal: number;
  mediaTotal: number;
  total: number;
  queryTime: number;
  embeddingTime?: number;
  connectorFacets: ConnectorFacet[];
}

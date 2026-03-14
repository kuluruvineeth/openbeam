import type { SearchResultDocument } from "@/features/search/types";
import { PUBLIC_API_BASE } from "./constants";

export type PublicSearchHit = {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  dataset: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  relevance: number;
  documentType: string;
};

export type PublicSearchFacets = {
  datasets: Array<{ dataset: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
};

export type PublicSearchResponse = {
  hits: PublicSearchHit[];
  total: number;
  limit: number;
  offset: number;
  query: string;
  facets: PublicSearchFacets;
  timing: { searchMs: number; totalMs: number };
};

type SearchParams = {
  q: string;
  dataset?: string;
  limit?: number;
  offset?: number;
};

export async function fetchPublicSearch(
  params: SearchParams
): Promise<PublicSearchResponse> {
  const url = new URL(`${PUBLIC_API_BASE}/search`, window.location.origin);
  url.searchParams.set("q", params.q);
  if (params.dataset) {
    url.searchParams.set("dataset", params.dataset);
  }
  if (params.limit != null) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params.offset != null) {
    url.searchParams.set("offset", String(params.offset));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    throw new Error(`Search failed: ${response.status}`);
  }

  return response.json() as Promise<PublicSearchResponse>;
}

export type PublicDocument = {
  id: string;
  title: string;
  content: string;
  url?: string;
  dataset: string;
  category: string;
  documentType: string;
  createdAt: number;
  updatedAt: number;
};

export async function fetchPublicDocument(
  id: string
): Promise<PublicDocument | null> {
  const response = await fetch(
    `${PUBLIC_API_BASE}/documents/${encodeURIComponent(id)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    throw new Error(`Failed to load document: ${response.status}`);
  }

  return response.json() as Promise<PublicDocument>;
}

export function toSearchResultDocument(
  hit: PublicSearchHit
): SearchResultDocument {
  return {
    id: hit.id,
    connector_id: "",
    connector_type: hit.dataset,
    team_id: "",
    workspace_id: "",
    external_id: hit.id,
    document_type: hit.documentType,
    title: hit.title,
    content: hit.snippet,
    created_at: hit.createdAt,
    updated_at: hit.updatedAt,
    url: hit.url,
    is_public: true,
  };
}

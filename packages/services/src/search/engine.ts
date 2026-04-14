import type { GenericDocument, MediaDocument } from "@openbeam/vespa";

interface SearchEngine {
  query<T = GenericDocument>(
    params: Record<string, unknown>
  ): Promise<{
    root: {
      children?: Array<{
        id: string;
        relevance: number;
        source: string;
        fields: T;
      }>;
      fields: { totalCount: number };
    };
  }>;
  getDocument(id: string): Promise<GenericDocument | null>;
  queryMedia<T = MediaDocument>(
    params: Record<string, unknown>
  ): Promise<{
    root: {
      children?: Array<{
        id: string;
        relevance: number;
        source: string;
        fields: T;
      }>;
      fields: { totalCount: number };
    };
  }>;
}

export type { SearchEngine };

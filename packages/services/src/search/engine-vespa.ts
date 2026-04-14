import {
  type GenericDocument,
  type MediaDocument,
  vespaClient,
} from "@openbeam/vespa";
import type { SearchEngine } from "./engine";

class VespaSearchEngine implements SearchEngine {
  async query<T = GenericDocument>(
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
  }> {
    return await vespaClient.query<T>(
      params as unknown as Parameters<typeof vespaClient.query>[0]
    );
  }

  async getDocument(id: string): Promise<GenericDocument | null> {
    return await vespaClient.getDocument(id);
  }

  async queryMedia<T = MediaDocument>(
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
  }> {
    return await vespaClient.queryMedia<T>(
      params as unknown as Parameters<typeof vespaClient.queryMedia>[0]
    );
  }
}

const vespaSearchEngine = new VespaSearchEngine();

export { VespaSearchEngine, vespaSearchEngine };

import type { BenchlingClient } from "../client";

export interface BenchlingAssayResult {
  id: string;
  schema?: { id: string; name: string } | null;
  fieldValidation?: Record<string, unknown>;
  fields: Record<string, { value: unknown; displayValue?: string }>;
  entryId?: string | null;
  projectId?: string | null;
  createdAt: string;
  modifiedAt: string;
  archiveRecord?: { reason: string } | null;
}

interface AssayResultsResponse {
  assayResults: BenchlingAssayResult[];
  nextToken?: string;
}

interface ListAssayResultsOptions {
  modifiedAt?: string;
  schemaId?: string;
}

export async function* listAssayResults(
  client: BenchlingClient,
  options: ListAssayResultsOptions = {}
): AsyncGenerator<BenchlingAssayResult[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    if (options.schemaId) {
      params.schemaId = options.schemaId;
    }

    const response = await client.get<AssayResultsResponse>(
      "/assay-results",
      params
    );

    if (response.assayResults.length > 0) {
      yield response.assayResults;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}

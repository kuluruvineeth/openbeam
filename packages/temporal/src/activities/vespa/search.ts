import type {
  GenericDocument,
  VespaClient,
  SearchResult as VespaSearchResult,
} from "@openplane/vespa";
import { escapeYqlString } from "@openplane/vespa";
import type { SearchInput, SearchResult } from "./types";

export function createSearchActivity(vespa: VespaClient) {
  return async function search(input: SearchInput): Promise<SearchResult> {
    const startTime = Date.now();

    const teamFilter = `team_id contains "${escapeYqlString(input.teamId)}"`;
    const connectorFilter =
      input.connectorTypes && input.connectorTypes.length > 0
        ? ` and connector_type in (${input.connectorTypes.map((t: string) => `"${escapeYqlString(t)}"`).join(", ")})`
        : "";

    const yql = `select * from openplane_document where ${teamFilter}${connectorFilter} and userQuery() limit ${input.limit ?? 10} offset ${input.offset ?? 0}`;

    const result: VespaSearchResult<GenericDocument> = await vespa.query({
      yql,
      hits: input.limit ?? 10,
      offset: input.offset ?? 0,
      ranking: "bm25",
    });

    type ResultChild = {
      id: string;
      relevance: number;
      source: string;
      fields: GenericDocument;
    };

    const hits =
      result.root?.children?.map((child: ResultChild) => ({
        id: child.id,
        relevance: child.relevance,
        fields: child.fields,
      })) ?? [];

    return {
      hits,
      totalCount: result.root?.fields?.totalCount ?? hits.length,
      durationMs: Date.now() - startTime,
    };
  };
}

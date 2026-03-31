import { SearchResultRow } from "@openbeam/ui/components/search-result-row";
import type { SearchResultDocument } from "@openbeam/ui/components/search-result-types";
import { EmptyState } from "../../shared/empty-state";
import type { SearchResult } from "./mock-data";

type SearchViewProps = {
  query: string;
  results: SearchResult[];
  total: number;
};

function toSearchDoc(result: SearchResult): SearchResultDocument {
  const updatedAtMs = result.updatedAt
    ? new Date(result.updatedAt).getTime() / 1000
    : Date.now() / 1000;

  return {
    id: result.id,
    connector_id: "",
    connector_type: result.source ?? result.connectorType ?? "",
    team_id: "",
    workspace_id: "",
    external_id: "",
    document_type: result.documentType ?? "message",
    title: result.title ?? "",
    content: result.snippet ?? "",
    source_name: result.sourceName,
    source_type: result.sourceType,
    author_name: result.authorName,
    author_avatar_url: result.authorAvatarUrl,
    created_at: updatedAtMs,
    updated_at: updatedAtMs,
    is_public: false,
    url: result.url,
  };
}

export function SearchView({ query, results, total }: SearchViewProps) {
  if (results.length === 0) {
    return (
      <EmptyState
        description={`Nothing matched \u201c${query}\u201d`}
        title="No results"
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2 px-3 pb-2">
        <span className="font-mono text-[10px] text-foreground/40 uppercase tracking-wide">
          Results
        </span>
        <span className="font-mono text-[10px] text-foreground/30 tabular-nums">
          {total}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/30">
        {results.map((result) => (
          <SearchResultRow
            document={toSearchDoc(result)}
            key={result.id}
            onSelect={
              result.url
                ? () => window.open(result.url, "_blank", "noopener")
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

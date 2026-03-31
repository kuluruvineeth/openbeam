import { SearchResultCard } from "@openbeam/ui/components/search-result-card";
import { ConnectorLogo } from "../../shared/connector-logo";
import { EmptyState } from "../../shared/empty-state";
import type { SearchResult } from "./mock-data";

type SearchViewProps = {
  query: string;
  results: SearchResult[];
  total: number;
};

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
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-sm">&ldquo;{query}&rdquo;</span>
        <span className="text-muted-foreground text-xs">
          {total} result{total !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {results.map((result) => (
          <SearchResultCard
            connectorType={result.source ?? result.connectorType ?? ""}
            icon={
              <ConnectorLogo
                size={20}
                type={result.source ?? result.connectorType ?? ""}
              />
            }
            id={result.id}
            key={result.id}
            onOpen={
              result.url
                ? () => window.open(result.url, "_blank", "noopener")
                : undefined
            }
            score={result.score}
            snippet={result.snippet}
            title={result.title}
            updatedAt={result.updatedAt}
            url={result.url}
          />
        ))}
      </div>
    </div>
  );
}

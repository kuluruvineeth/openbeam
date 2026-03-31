import { SearchResultCard } from "@openbeam/ui/components/search-result-card";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { SearchResult } from "./mock-data";

interface SearchViewProps {
  query: string;
  results: SearchResult[];
  total: number;
}

export function SearchView({ query, results, total }: SearchViewProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-8 text-center">
        <span className="font-medium text-sm">No results</span>
        <span className="text-muted-foreground text-xs">
          Nothing matched &ldquo;{query}&rdquo;
        </span>
      </div>
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
      <div className="flex flex-col gap-2">
        {results.map((result) => (
          <SearchResultCard
            connectorType={result.source ?? result.connectorType}
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

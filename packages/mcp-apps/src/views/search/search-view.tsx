import { EmptyState } from "../../shared/empty-state";
import { SearchResultRowLite } from "../../shared/search-result-row-lite";
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
          <SearchResultRowLite
            key={result.id}
            onSelect={
              result.url
                ? () => window.open(result.url, "_blank", "noopener")
                : undefined
            }
            result={result}
          />
        ))}
      </div>
    </div>
  );
}

import type { SearchResult } from "./mock-data";
import { ResultCard } from "./result-card";

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
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

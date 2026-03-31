import { SearchResultRow } from "@openbeam/ui/components/search-result-row";
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
        {results.map((result) => {
          const connectorType = result.source ?? result.connectorType ?? "";
          return (
            <SearchResultRow
              icon={<ConnectorLogo size={16} type={connectorType} />}
              key={result.id}
              onClick={
                result.url
                  ? () => window.open(result.url, "_blank", "noopener")
                  : undefined
              }
              snippet={result.snippet}
              title={result.title}
              typeLabel={connectorType.replace(/_/g, " ")}
              updatedAt={result.updatedAt}
            />
          );
        })}
      </div>
    </div>
  );
}

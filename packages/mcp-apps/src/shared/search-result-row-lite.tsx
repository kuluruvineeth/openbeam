import { formatRelativeTime } from "@openbeam/ui/utils/format";
import { ConnectorLogo } from "./connector-logo";

export type LiteSearchResult = {
  id: string;
  title?: string;
  snippet?: string;
  source?: string;
  connectorType?: string;
  url?: string;
  authorName?: string;
  updatedAt?: string;
};

type SearchResultRowLiteProps = {
  result: LiteSearchResult;
  onSelect?: () => void;
};

export function SearchResultRowLite({
  result,
  onSelect,
}: SearchResultRowLiteProps) {
  const source = result.source ?? result.connectorType ?? "";
  const timestamp = result.updatedAt
    ? formatRelativeTime(result.updatedAt)
    : null;
  const interactive = Boolean(onSelect);

  if (interactive) {
    return (
      <button
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        onClick={onSelect}
        type="button"
      >
        <SearchResultContent
          authorName={result.authorName}
          snippet={result.snippet}
          source={source}
          timestamp={timestamp}
          title={result.title ?? "Untitled"}
        />
      </button>
    );
  }

  return (
    <div className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
      <SearchResultContent
        authorName={result.authorName}
        snippet={result.snippet}
        source={source}
        timestamp={timestamp}
        title={result.title ?? "Untitled"}
      />
    </div>
  );
}

type SearchResultContentProps = {
  title: string;
  snippet?: string;
  source: string;
  authorName?: string;
  timestamp: string | null;
};

function SearchResultContent({
  title,
  snippet,
  source,
  authorName,
  timestamp,
}: SearchResultContentProps) {
  return (
    <>
      {source && (
        <div className="mt-0.5 shrink-0">
          <ConnectorLogo size={20} type={source} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-sm">{title}</span>
          {timestamp && (
            <span className="shrink-0 font-mono text-[10px] text-foreground/30 tabular-nums">
              {timestamp}
            </span>
          )}
        </div>
        {snippet && (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {snippet}
          </p>
        )}
        {(authorName || source) && (
          <div className="flex items-center gap-2 text-[10px] text-foreground/40">
            {authorName && <span>{authorName}</span>}
            {authorName && source && <span>&middot;</span>}
            {source && <span className="uppercase">{source}</span>}
          </div>
        )}
      </div>
    </>
  );
}

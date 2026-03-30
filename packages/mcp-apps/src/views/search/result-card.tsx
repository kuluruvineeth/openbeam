import { ScoreBadge } from "@openbeam/ui/components/score-badge";
import { formatRelativeDate } from "@openbeam/ui/utils/format";
import { SourceIcon } from "../../shared/source-icon";
import type { SearchResult } from "./mock-data";

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
      {source}
    </span>
  );
}

interface ResultCardProps {
  result: SearchResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const handleClick = () => {
    if (result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      className={`flex w-full gap-3 rounded-sm border border-border/50 p-3 text-left transition-colors ${
        result.url ? "cursor-pointer hover:bg-muted/50" : ""
      }`}
      onClick={handleClick}
      type="button"
    >
      <SourceIcon type={result.source} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium text-sm">{result.title}</span>
        <span className="line-clamp-2 text-muted-foreground text-xs">
          {result.snippet}
        </span>
        <div className="flex items-center gap-1.5 pt-0.5">
          <SourceBadge source={result.source} />
          <ScoreBadge score={result.score * 100} />
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeDate(result.updatedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

"use client";

type Props = {
  total: number;
  documentTotal: number;
  mediaTotal: number;
  queryTime: number;
  isSearching: boolean;
};

export function SearchStats({
  total,
  documentTotal,
  mediaTotal,
  queryTime,
  isSearching,
}: Props) {
  if (isSearching || total === 0) {
    return null;
  }

  const showSplit = documentTotal > 0 && mediaTotal > 0;

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {showSplit ? (
        <>
          <span className="text-foreground/70 tabular-nums">
            {documentTotal.toLocaleString()}
          </span>
          <span className="text-foreground/40 text-xs">docs</span>
          <span className="text-foreground/20">·</span>
          <span className="text-foreground/70 tabular-nums">
            {mediaTotal.toLocaleString()}
          </span>
          <span className="text-foreground/40 text-xs">media</span>
        </>
      ) : (
        <>
          <span className="text-foreground/70 tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-foreground/40 text-xs">results</span>
        </>
      )}
      <span className="ml-2 text-[10px] text-foreground/25 tabular-nums">
        {queryTime}ms
      </span>
    </div>
  );
}

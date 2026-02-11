"use client";

import { memo, useState } from "react";

const URL_PATTERN = /^https?:\/\/\S+$/;
const TRUNCATION_THRESHOLD = 100;

function isUrl(value: string): boolean {
  return URL_PATTERN.test(value);
}

type MemoryValueDisplayProps = {
  value: unknown;
};

export const MemoryValueDisplay = memo(function MemoryValueDisplayInner({
  value,
}: MemoryValueDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (typeof value === "string") {
    if (isUrl(value)) {
      return (
        <a
          className="text-primary text-xs underline underline-offset-2 hover:text-primary/80"
          href={value}
          rel="noopener noreferrer"
          target="_blank"
        >
          {value}
        </a>
      );
    }

    if (value.length <= TRUNCATION_THRESHOLD) {
      return <span className="text-xs">{value}</span>;
    }

    return (
      <div className="space-y-1">
        <span className="text-xs">
          {expanded ? value : `${value.slice(0, TRUNCATION_THRESHOLD)}...`}
        </span>
        <button
          className="block text-[10px] text-primary hover:text-primary/80"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      </div>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-xs italic">null</span>;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return <span className="font-mono text-xs">{String(value)}</span>;
  }

  const formatted = JSON.stringify(value, null, 2);

  return (
    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-sm bg-muted/30 p-1.5 font-mono text-xs">
      {formatted}
    </pre>
  );
});

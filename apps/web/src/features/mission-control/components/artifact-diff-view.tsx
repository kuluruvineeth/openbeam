"use client";

import { cn } from "@/lib/utils";
import type { ArtifactType } from "./artifact-card";

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  text: string;
  lineNumber: number;
};

function computeLineDiff(previous: string, current: string): DiffLine[] {
  const prevLines = previous.split("\n");
  const currLines = current.split("\n");
  const result: DiffLine[] = [];
  const maxLen = Math.max(prevLines.length, currLines.length);
  let lineNum = 1;

  for (let i = 0; i < maxLen; i++) {
    const prevLine = prevLines[i];
    const currLine = currLines[i];

    if (prevLine === undefined && currLine !== undefined) {
      lineNum += 1;
      result.push({ type: "added", text: currLine, lineNumber: lineNum });
    } else if (prevLine !== undefined && currLine === undefined) {
      lineNum += 1;
      result.push({ type: "removed", text: prevLine, lineNumber: lineNum });
    } else if (prevLine !== currLine) {
      result.push({
        type: "removed",
        text: prevLine ?? "",
        lineNumber: lineNum,
      });
      result.push({ type: "added", text: currLine ?? "", lineNumber: lineNum });
      lineNum += 1;
    } else {
      lineNum += 1;
      result.push({
        type: "unchanged",
        text: currLine ?? "",
        lineNumber: lineNum,
      });
    }
  }

  return result;
}

type ArtifactDiffViewProps = {
  previous: string;
  current: string;
  type: ArtifactType;
};

function TextDiff({
  previous,
  current,
}: {
  previous: string;
  current: string;
}) {
  const lines = computeLineDiff(previous, current);

  return (
    <div className="overflow-x-auto rounded-md border border-border/50 font-mono text-xs">
      {lines.map((line, idx) => (
        <div
          className={cn(
            "flex",
            line.type === "added" && "bg-emerald-500/10",
            line.type === "removed" && "bg-red-500/10"
          )}
          key={`diff-${idx}`}
        >
          <span className="w-10 shrink-0 select-none border-border/30 border-r px-2 py-0.5 text-right text-muted-foreground/50 tabular-nums">
            {line.lineNumber}
          </span>
          <span className="w-4 shrink-0 select-none py-0.5 text-center">
            {line.type === "added" && (
              <span className="text-emerald-600 dark:text-emerald-400">+</span>
            )}
            {line.type === "removed" && (
              <span className="text-red-600 dark:text-red-400">-</span>
            )}
          </span>
          <span className="flex-1 whitespace-pre-wrap break-all px-2 py-0.5">
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function ImageDiff({
  previous,
  current,
}: {
  previous: string;
  current: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="mb-1 font-medium text-muted-foreground text-xs">
          Previous
        </div>
        {/* biome-ignore lint/performance/noImgElement: dynamic comparison URLs from artifact diff */}
        {/* biome-ignore lint/correctness/useImageSize: dimensions unknown for dynamic diff images */}
        <img
          alt="Previous version"
          className="max-h-64 rounded-md border border-border/50 object-contain"
          src={previous}
        />
      </div>
      <div>
        <div className="mb-1 font-medium text-muted-foreground text-xs">
          Current
        </div>
        {/* biome-ignore lint/performance/noImgElement: dynamic comparison URLs from artifact diff */}
        {/* biome-ignore lint/correctness/useImageSize: dimensions unknown for dynamic diff images */}
        <img
          alt="Current version"
          className="max-h-64 rounded-md border border-border/50 object-contain"
          src={current}
        />
      </div>
    </div>
  );
}

export function ArtifactDiffView({
  previous,
  current,
  type,
}: ArtifactDiffViewProps) {
  if (type === "image") {
    return <ImageDiff current={current} previous={previous} />;
  }

  return <TextDiff current={current} previous={previous} />;
}

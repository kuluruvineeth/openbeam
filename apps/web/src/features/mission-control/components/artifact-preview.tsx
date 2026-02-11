"use client";

import { Icons } from "@openplane/ui";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { ArtifactType } from "./artifact-card";

type ArtifactPreviewProps = {
  type: ArtifactType;
  content: unknown;
  title: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      className="absolute top-2 right-2 rounded-sm bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
      onClick={handleCopy}
      type="button"
    >
      {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
    </button>
  );
}

function DataTablePreview({ data }: { data: unknown }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const firstRow = data[0];
  if (typeof firstRow !== "object" || firstRow === null) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const headers = Object.keys(firstRow as Record<string, unknown>);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border/50 border-b">
            {headers.map((header) => (
              <th
                className="px-3 py-2 text-left font-medium text-muted-foreground text-xs"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((row, rowIndex) => {
            const record = row as Record<string, unknown>;
            return (
              <tr className="border-border/30 border-b" key={`row-${rowIndex}`}>
                {headers.map((header) => (
                  <td
                    className="px-3 py-1.5 font-mono text-xs"
                    key={`${rowIndex}-${header}`}
                  >
                    {String(record[header] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length > 50 && (
        <div className="px-3 py-2 text-center text-muted-foreground text-xs">
          Showing 50 of {data.length} rows
        </div>
      )}
    </div>
  );
}

export function ArtifactPreview({
  type,
  content,
  title,
}: ArtifactPreviewProps) {
  const textContent = String(content ?? "");

  switch (type) {
    case "document":
    case "report":
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {textContent}
        </div>
      );

    case "code":
      return (
        <div className="relative">
          <CopyButton text={textContent} />
          <pre
            className={cn(
              "overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm",
              "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
            )}
          >
            <code>{textContent}</code>
          </pre>
        </div>
      );

    case "data":
      return <DataTablePreview data={content} />;

    case "image":
      return (
        <div className="flex items-center justify-center">
          {/* biome-ignore lint/performance/noImgElement: dynamic artifact URL */}
          {/* biome-ignore lint/correctness/useImageSize: dimensions unknown for dynamic artifact images */}
          <img
            alt={title}
            className="max-h-96 rounded-md object-contain"
            src={textContent}
          />
        </div>
      );

    default:
      return (
        <pre className="whitespace-pre-wrap font-mono text-sm">
          {textContent}
        </pre>
      );
  }
}

"use client";

import { buildToolCallDisplayModel } from "@openbeam/types/services/daemon";
import { cn, Icons } from "@openbeam/ui";
import { cva } from "class-variance-authority";
import { useCallback, useMemo, useState } from "react";
import { buildLineDiff, parseUnifiedDiff } from "../lib/tool-call-parsers";
import type { DiffLine, ToolCallItem, ToolCallPayload } from "../types";

const TRAILING_NEWLINES = /\n+$/;
const LEADING_NEWLINES = /^\n+/;

const toolCallVariants = cva(
  "group flex items-start gap-2 rounded-sm border px-3 py-1.5 text-xs transition-colors",
  {
    variants: {
      status: {
        executing:
          "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
        completed: "border-border/30 bg-transparent text-muted-foreground",
        failed: "border-destructive/20 bg-destructive/5 text-destructive",
      },
    },
    defaultVariants: {
      status: "completed",
    },
  }
);

type ToolCallStatus = "executing" | "completed" | "failed";

function resolveStatus(payload: ToolCallPayload): ToolCallStatus {
  if (payload.source === "agent") {
    const s = payload.data.status;
    if (s === "running") {
      return "executing";
    }
    if (s === "failed") {
      return "failed";
    }
    return "completed";
  }
  return payload.data.status;
}

function ToolCallIcon({ status }: { status: ToolCallStatus }) {
  if (status === "executing") {
    return <Icons.Loader2 className="mt-px size-3 animate-spin" />;
  }
  if (status === "failed") {
    return <Icons.AlertCircle className="mt-px size-3" />;
  }
  return <Icons.Check className="mt-px size-3 text-muted-foreground/60" />;
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const lineClass = cn(
    "whitespace-pre px-3 font-mono text-[11px] leading-5",
    line.type === "add" &&
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    line.type === "remove" && "bg-destructive/10 text-destructive",
    line.type === "header" &&
      "bg-muted/30 font-medium text-muted-foreground/50",
    line.type === "context" && "text-muted-foreground"
  );

  if (line.segments && line.segments.length > 0) {
    return (
      <div className={lineClass}>
        {line.content[0]}
        {line.segments.map((seg, i) => (
          <span
            className={cn(
              seg.changed &&
                (line.type === "add"
                  ? "rounded-[1px] bg-emerald-500/20"
                  : "rounded-[1px] bg-destructive/20")
            )}
            key={i}
          >
            {seg.text}
          </span>
        ))}
      </div>
    );
  }

  return <div className={lineClass}>{line.content}</div>;
}

function DiffView({ lines }: { lines: DiffLine[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="max-h-64 overflow-auto rounded-sm border border-border/30 bg-muted/20">
      {lines.map((line, i) => (
        <DiffLineRow key={i} line={line} />
      ))}
    </div>
  );
}

function ShellOutput({
  command,
  output,
}: {
  command: string;
  output?: string;
}) {
  const hasOutput = output && output.length > 0;

  return (
    <div className="max-h-64 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-2.5">
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-foreground leading-5">
        <span className="text-muted-foreground">$ </span>
        {command.replace(TRAILING_NEWLINES, "")}
        {hasOutput && (
          <>
            {"\n\n"}
            <span className="text-muted-foreground">
              {output.replace(LEADING_NEWLINES, "")}
            </span>
          </>
        )}
      </pre>
    </div>
  );
}

function FileContentView({ content }: { content: string }) {
  return (
    <div className="max-h-48 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-2.5">
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-5">
        {content}
      </pre>
    </div>
  );
}

function JsonView({ data, label }: { data: unknown; label: string }) {
  let text: string;
  try {
    text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  } catch {
    text = String(data);
  }

  if (!text || text === "null" || text === "undefined") {
    return null;
  }

  return (
    <div className="space-y-1">
      <span className="font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        {label}
      </span>
      <div className="max-h-40 overflow-auto rounded-sm border border-border/30 bg-muted/20 p-2">
        <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-5">
          {text}
        </pre>
      </div>
    </div>
  );
}

function ToolCallDetailContent({
  payload,
}: {
  payload: ToolCallPayload;
  cwd?: string;
}) {
  if (payload.source === "agent") {
    const { detail, error, status } = payload.data;
    let errorText: string | undefined;
    if (status === "failed" && error) {
      errorText =
        typeof error === "string" ? error : JSON.stringify(error, null, 2);
    }

    switch (detail.type) {
      case "shell":
        return (
          <div className="space-y-2">
            <ShellOutput
              command={detail.command}
              output={detail.output ?? undefined}
            />
            {errorText && (
              <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-2">
                <pre className="whitespace-pre-wrap font-mono text-[11px] text-destructive">
                  {errorText}
                </pre>
              </div>
            )}
          </div>
        );

      case "edit": {
        const lines = detail.unifiedDiff
          ? parseUnifiedDiff(detail.unifiedDiff)
          : buildLineDiff(detail.oldString ?? "", detail.newString ?? "");
        return <DiffView lines={lines} />;
      }

      case "read":
        return detail.content ? (
          <FileContentView content={detail.content} />
        ) : null;

      case "write":
        return detail.content ? (
          <FileContentView content={detail.content} />
        ) : null;

      case "search":
        return (
          <div className="rounded-sm border border-border/30 bg-muted/20 p-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {detail.query}
            </span>
          </div>
        );

      case "unknown": {
        const hasInput = detail.input !== null && detail.input !== undefined;
        const hasOutput = detail.output !== null && detail.output !== undefined;

        if (!(hasInput || hasOutput || errorText)) {
          return null;
        }

        return (
          <div className="space-y-2">
            {hasInput && <JsonView data={detail.input} label="Input" />}
            {hasOutput && <JsonView data={detail.output} label="Output" />}
            {errorText && (
              <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-2">
                <pre className="whitespace-pre-wrap font-mono text-[11px] text-destructive">
                  {errorText}
                </pre>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }

  const data = payload.data as {
    toolCallId: string;
    toolName: string;
    arguments: unknown;
    result?: unknown;
    error?: unknown;
    status: string;
  };
  const hasArgs = data.arguments !== null && data.arguments !== undefined;
  const hasResult = data.result !== null && data.result !== undefined;
  const hasError = data.error !== null && data.error !== undefined;

  if (!(hasArgs || hasResult || hasError)) {
    return null;
  }

  return (
    <div className="space-y-2">
      {hasArgs && <JsonView data={data.arguments} label="Arguments" />}
      {hasResult && <JsonView data={data.result} label="Result" />}
      {hasError && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-2">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-destructive">
            {typeof data.error === "string"
              ? data.error
              : JSON.stringify(data.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ToolCallDisplay({
  item,
  cwd,
  defaultExpanded = false,
}: {
  item: ToolCallItem;
  cwd?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status = resolveStatus(item.payload);

  const displayModel = useMemo(() => {
    if (item.payload.source === "agent") {
      const d = item.payload.data;
      return buildToolCallDisplayModel({
        name: d.name,
        status: d.status,
        error: d.error,
        metadata: d.metadata,
        detail: d.detail,
        cwd,
      });
    }
    return {
      displayName: item.payload.data.toolName,
      summary: undefined,
      errorText: undefined,
    };
  }, [item.payload, cwd]);

  const toggle = useCallback(() => setExpanded((p) => !p), []);

  return (
    <div className="space-y-1">
      <button
        className={toolCallVariants({ status })}
        onClick={toggle}
        type="button"
      >
        <ToolCallIcon status={status} />
        <span className="flex flex-1 items-baseline gap-1.5 overflow-hidden">
          <span className="shrink-0 font-medium">
            {displayModel.displayName}
          </span>
          {displayModel.summary && (
            <span className="truncate font-mono text-[11px] opacity-70">
              {displayModel.summary}
            </span>
          )}
        </span>
        <Icons.ChevronDown
          className={cn(
            "mt-px size-3 shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="ml-5 space-y-2 pb-1">
          <ToolCallDetailContent cwd={cwd} payload={item.payload} />
          {displayModel.errorText && (
            <p className="text-[11px] text-destructive">
              {displayModel.errorText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CompactToolCallBadge({
  name,
  status,
}: {
  name: string;
  status: ToolCallStatus;
}) {
  return (
    <span className={toolCallVariants({ status })}>
      <ToolCallIcon status={status} />
      <span className="font-medium">{name}</span>
    </span>
  );
}

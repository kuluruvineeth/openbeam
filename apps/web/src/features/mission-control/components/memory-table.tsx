"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { memo, useState } from "react";
import type { MemoryEntry, MemoryScope } from "../hooks/use-memory";
import { MemoryValueDisplay } from "./memory-value-display";

const scopeBadgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-[10px]",
  {
    variants: {
      scope: {
        mission: "bg-primary/10 text-primary",
        agent: "bg-amber-500/10 text-amber-600",
        task: "bg-muted text-muted-foreground",
        all: "bg-muted text-muted-foreground",
      },
    },
  }
);

const KEY_TRUNCATION = 200;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < MINUTE_MS) {
    return "just now";
  }
  if (delta < HOUR_MS) {
    return `${Math.floor(delta / MINUTE_MS)}m ago`;
  }
  return `${Math.floor(delta / HOUR_MS)}h ago`;
}

function truncateKey(key: string): string {
  return key.length > KEY_TRUNCATION
    ? `${key.slice(0, KEY_TRUNCATION)}...`
    : key;
}

type MemoryTableRowProps = {
  entry: MemoryEntry;
  onEdit: (entry: MemoryEntry) => void;
  onDelete: (key: string) => void;
};

const MemoryTableRow = memo(function MemoryTableRowInner({
  entry,
  onEdit,
  onDelete,
}: MemoryTableRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      className="border-border/50 border-b transition-colors hover:bg-muted/30"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-3 py-2 align-top">
        <span className="font-medium font-mono text-xs">
          {truncateKey(entry.key)}
        </span>
      </td>
      <td className="max-w-xs px-3 py-2 align-top">
        <MemoryValueDisplay value={entry.value} />
      </td>
      <td className="px-3 py-2 align-top">
        <span
          className={scopeBadgeVariants({
            scope: entry.scope as Exclude<MemoryScope, "all">,
          })}
        >
          {entry.scope}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-muted-foreground text-xs tabular-nums">
        {formatRelativeTime(entry.updatedAt)}
      </td>
      <td className="w-16 px-2 py-2 align-top">
        {hovered && (
          <div className="flex items-center gap-1">
            <button
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onEdit(entry)}
              type="button"
            >
              <Icons.Edit2 size={13} />
            </button>
            <button
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(entry.key)}
              type="button"
            >
              <Icons.Trash size={13} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

type MemoryTableProps = {
  entries: MemoryEntry[];
  onEdit: (entry: MemoryEntry) => void;
  onDelete: (key: string) => void;
};

export function MemoryTable({ entries, onEdit, onDelete }: MemoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No memory entries found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-border/50 border-b">
            <th className="px-3 py-2 font-medium text-muted-foreground text-xs">
              Key
            </th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-xs">
              Value
            </th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-xs">
              Scope
            </th>
            <th className="px-3 py-2 font-medium text-muted-foreground text-xs">
              Updated
            </th>
            <th className="w-16 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <MemoryTableRow
              entry={entry}
              key={entry.key}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { scopeBadgeVariants };

"use client";

import type { DatabaseOperation } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Label } from "../../label";

interface StructuredFieldsProps {
  operation: DatabaseOperation;
  table?: string;
  columns?: string[];
  whereClause?: string;
  orderBy?: string;
  values?: Record<string, string>;
  conflictColumn?: string;
  onChange: (updates: {
    table?: string;
    columns?: string[];
    whereClause?: string;
    orderBy?: string;
    values?: Record<string, string>;
    conflictColumn?: string;
  }) => void;
  disabled?: boolean;
}

const NEEDS_TABLE = new Set<DatabaseOperation>([
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
]);

const NEEDS_WHERE = new Set<DatabaseOperation>(["select", "update", "delete"]);

const NEEDS_ORDER = new Set<DatabaseOperation>(["select"]);

const NEEDS_VALUES = new Set<DatabaseOperation>(["insert", "update", "upsert"]);

const NEEDS_CONFLICT = new Set<DatabaseOperation>(["upsert"]);

const NEEDS_COLUMNS = new Set<DatabaseOperation>(["select"]);

export const StructuredFields = memo(
  forwardRef<HTMLDivElement, StructuredFieldsProps>(
    function StructuredFieldsComponent(
      {
        operation,
        table,
        columns,
        whereClause,
        orderBy,
        values,
        conflictColumn,
        onChange,
        disabled,
      },
      ref
    ) {
      const handleTableChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange({ table: e.target.value });
        },
        [onChange]
      );

      const handleColumnsChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const cols = e.target.value
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          onChange({ columns: cols.length > 0 ? cols : undefined });
        },
        [onChange]
      );

      const handleWhereChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange({ whereClause: e.target.value || undefined });
        },
        [onChange]
      );

      const handleOrderChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange({ orderBy: e.target.value || undefined });
        },
        [onChange]
      );

      const handleConflictChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange({ conflictColumn: e.target.value || undefined });
        },
        [onChange]
      );

      const handleAddValue = useCallback(() => {
        onChange({ values: { ...values, "": "" } });
      }, [values, onChange]);

      const handleRemoveValue = useCallback(
        (key: string) => {
          const next = { ...values };
          delete next[key];
          onChange({ values: Object.keys(next).length > 0 ? next : undefined });
        },
        [values, onChange]
      );

      const handleValueChange = useCallback(
        (oldKey: string, newKey: string, val: string) => {
          const entries = Object.entries(values ?? {});
          const updated: Record<string, string> = {};
          for (const [k, v] of entries) {
            if (k === oldKey) {
              updated[newKey] = val;
            } else {
              updated[k] = v;
            }
          }
          onChange({
            values: Object.keys(updated).length > 0 ? updated : undefined,
          });
        },
        [values, onChange]
      );

      if (!NEEDS_TABLE.has(operation)) {
        return null;
      }

      return (
        <div className="space-y-3" ref={ref}>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Table</Label>
            <Input
              className="h-8 font-mono text-xs"
              disabled={disabled}
              onChange={handleTableChange}
              placeholder="e.g. users"
              value={table ?? ""}
            />
          </div>

          {NEEDS_COLUMNS.has(operation) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Columns</Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={handleColumnsChange}
                placeholder="* or col1, col2, col3"
                value={columns?.join(", ") ?? ""}
              />
            </div>
          )}

          {NEEDS_WHERE.has(operation) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                WHERE clause
              </Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={handleWhereChange}
                placeholder="e.g. status = 'active'"
                value={whereClause ?? ""}
              />
            </div>
          )}

          {NEEDS_ORDER.has(operation) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">ORDER BY</Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={handleOrderChange}
                placeholder="e.g. created_at DESC"
                value={orderBy ?? ""}
              />
            </div>
          )}

          {NEEDS_CONFLICT.has(operation) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Conflict column
              </Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                onChange={handleConflictChange}
                placeholder="e.g. id"
                value={conflictColumn ?? ""}
              />
            </div>
          )}

          {NEEDS_VALUES.has(operation) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Values</Label>
              <div className="space-y-1.5">
                {Object.entries(values ?? {}).map(([key, val], index) => (
                  <div
                    className="group flex items-center gap-1.5"
                    key={`${index}-${key}`}
                  >
                    <Input
                      className="h-8 w-28 shrink-0 font-mono text-xs"
                      disabled={disabled}
                      onChange={(e) =>
                        handleValueChange(key, e.target.value, val)
                      }
                      placeholder="column"
                      value={key}
                    />
                    <Input
                      className="h-8 flex-1 font-mono text-xs"
                      disabled={disabled}
                      onChange={(e) =>
                        handleValueChange(key, key, e.target.value)
                      }
                      placeholder="value"
                      value={val}
                    />
                    <button
                      className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive disabled:pointer-events-none group-hover:opacity-100"
                      disabled={disabled}
                      onClick={() => handleRemoveValue(key)}
                      type="button"
                    >
                      <Icons.Trash className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={disabled}
                onClick={handleAddValue}
                type="button"
              >
                <Icons.Plus className="size-3" />
                Add value
              </button>
            </div>
          )}
        </div>
      );
    }
  )
);

StructuredFields.displayName = "StructuredFields";

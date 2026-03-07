"use client";

import type { DatabaseEngine } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Label } from "../../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const ENGINE_OPTIONS: { value: DatabaseEngine; label: string }[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mssql", label: "SQL Server" },
  { value: "sqlite", label: "SQLite" },
  { value: "mariadb", label: "MariaDB" },
  { value: "oracle", label: "Oracle" },
];

interface ConnectionSelectorProps {
  connectionId: string;
  engine: DatabaseEngine;
  onChange: (updates: {
    connectionId?: string;
    engine?: DatabaseEngine;
  }) => void;
  disabled?: boolean;
}

export const ConnectionSelector = memo(
  forwardRef<HTMLDivElement, ConnectionSelectorProps>(
    function ConnectionSelectorComponent(
      { connectionId, engine, onChange, disabled },
      ref
    ) {
      const handleConnectionChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          onChange({ connectionId: e.target.value });
        },
        [onChange]
      );

      const handleEngineChange = useCallback(
        (value: string) => {
          onChange({ engine: value as DatabaseEngine });
        },
        [onChange]
      );

      return (
        <div className="space-y-3" ref={ref}>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Engine</Label>
            <Select
              disabled={disabled}
              onValueChange={handleEngineChange}
              value={engine}
            >
              <SelectTrigger className="h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Icons.Database className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {ENGINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Connection ID
            </Label>
            <Input
              className="h-8 font-mono text-xs"
              disabled={disabled}
              onChange={handleConnectionChange}
              placeholder="e.g. my-postgres-db"
              value={connectionId}
            />
          </div>
        </div>
      );
    }
  )
);

ConnectionSelector.displayName = "ConnectionSelector";

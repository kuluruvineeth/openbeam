"use client";

import type { QueryBatchMode, QueryOutputFormat } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Input } from "../../input";
import { Label } from "../../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Slider } from "../../slider";
import { Switch } from "../../switch";

const TIMEOUT_OPTIONS = [
  { value: 5000, label: "5s" },
  { value: 10_000, label: "10s" },
  { value: 30_000, label: "30s" },
  { value: 60_000, label: "1m" },
  { value: 120_000, label: "2m" },
  { value: 300_000, label: "5m" },
];

function formatTimeout(ms: number): string {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  return `${ms / 60_000}m`;
}

const BATCH_MODE_LABELS: Record<QueryBatchMode, string> = {
  single: "Single",
  independent: "Independent",
  transaction: "Transaction",
};

const OUTPUT_FORMAT_LABELS: Record<QueryOutputFormat, string> = {
  rows: "All Rows",
  first_row: "First Row",
  count: "Count Only",
  raw: "Raw Result",
};

interface ExecutionSectionProps {
  timeout: number;
  readOnly: boolean;
  maxRows: number;
  batchMode: QueryBatchMode;
  outputFormat: QueryOutputFormat;
  continueOnError: boolean;
  onChange: (updates: {
    timeout?: number;
    readOnly?: boolean;
    maxRows?: number;
    batchMode?: QueryBatchMode;
    outputFormat?: QueryOutputFormat;
    continueOnError?: boolean;
  }) => void;
  disabled?: boolean;
}

export const ExecutionSection = memo(
  forwardRef<HTMLDivElement, ExecutionSectionProps>(
    function ExecutionSectionComponent(
      {
        timeout,
        readOnly,
        maxRows,
        batchMode,
        outputFormat,
        continueOnError,
        onChange,
        disabled,
      },
      ref
    ) {
      const handleTimeoutChange = useCallback(
        (values: number[]) => {
          const idx = values[0];
          if (idx !== undefined) {
            const option = TIMEOUT_OPTIONS[idx];
            if (option) {
              onChange({ timeout: option.value });
            }
          }
        },
        [onChange]
      );

      const handleMaxRowsChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(val) && val > 0) {
            onChange({ maxRows: val });
          }
        },
        [onChange]
      );

      const handleBatchModeChange = useCallback(
        (val: string) => {
          onChange({ batchMode: val as QueryBatchMode });
        },
        [onChange]
      );

      const handleOutputFormatChange = useCallback(
        (val: string) => {
          onChange({ outputFormat: val as QueryOutputFormat });
        },
        [onChange]
      );

      const timeoutIndex = Math.max(
        0,
        TIMEOUT_OPTIONS.findIndex((o) => o.value === timeout)
      );

      return (
        <div className="space-y-4" ref={ref}>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Timeout</Label>
            <Slider
              disabled={disabled}
              max={TIMEOUT_OPTIONS.length - 1}
              min={0}
              onValueChange={handleTimeoutChange}
              step={1}
              value={[timeoutIndex]}
            />
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>5s</span>
              <span className="font-medium text-foreground">
                {formatTimeout(timeout)}
              </span>
              <span>5m</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Max Rows</Label>
            <Input
              className="h-8 text-xs"
              disabled={disabled}
              min={1}
              onChange={handleMaxRowsChange}
              type="number"
              value={maxRows}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Batch Mode</Label>
            <Select
              disabled={disabled}
              onValueChange={handleBatchModeChange}
              value={batchMode}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(BATCH_MODE_LABELS) as [
                    QueryBatchMode,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Output Format
            </Label>
            <Select
              disabled={disabled}
              onValueChange={handleOutputFormatChange}
              value={outputFormat}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(OUTPUT_FORMAT_LABELS) as [
                    QueryOutputFormat,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Read Only</Label>
              <p className="text-muted-foreground text-xs">
                Prevent write operations
              </p>
            </div>
            <Switch
              checked={readOnly}
              disabled={disabled}
              onCheckedChange={(val) => onChange({ readOnly: val })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Continue on Error</Label>
              <p className="text-muted-foreground text-xs">
                Don&apos;t fail the workflow on query errors
              </p>
            </div>
            <Switch
              checked={continueOnError}
              disabled={disabled}
              onCheckedChange={(val) => onChange({ continueOnError: val })}
            />
          </div>
        </div>
      );
    }
  )
);

ExecutionSection.displayName = "ExecutionSection";

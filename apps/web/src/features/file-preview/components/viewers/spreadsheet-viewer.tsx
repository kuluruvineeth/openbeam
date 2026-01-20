"use client";

import { Button, TooltipProvider } from "@openplane/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { read, utils, type WorkBook } from "xlsx";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SpreadsheetSkeleton } from "../file-preview-loading";
import { SpreadsheetToolbar } from "./spreadsheet-toolbar";

type SpreadsheetViewerProps = {
  url: string;
  fileName: string;
};

type ViewerState = "loading" | "ready" | "error";

type CellValue = string | number | boolean | null;

const HIDE_CONTROLS_DELAY = 3000;

export function SpreadsheetViewer({ url }: SpreadsheetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<ViewerState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [data, setData] = useState<CellValue[][]>([]);
  const [showControls, setShowControls] = useState(true);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(
      () => setShowControls(false),
      HIDE_CONTROLS_DELAY
    );
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [resetHideTimer]);

  const loadSpreadsheet = useCallback(async () => {
    setState("loading");
    setErrorMessage(undefined);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch spreadsheet: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const wb = read(arrayBuffer, { type: "array" });

      setWorkbook(wb);
      setActiveSheet(wb.SheetNames[0]);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load spreadsheet"
      );
    }
  }, [url]);

  useEffect(() => {
    loadSpreadsheet();
  }, [loadSpreadsheet]);

  useEffect(() => {
    if (!(workbook && activeSheet)) {
      return;
    }

    const sheet = workbook.Sheets[activeSheet];
    const jsonData = utils.sheet_to_json<CellValue[]>(sheet, { header: 1 });
    setData(jsonData);
  }, [workbook, activeSheet]);

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Icons.AlertCircle className="text-destructive/50" size={24} />
        <p className="text-foreground/50 text-sm">{errorMessage}</p>
        <div className="flex gap-2">
          <Button
            className="h-8 px-3 text-xs"
            onClick={loadSpreadsheet}
            variant="outline"
          >
            <Icons.RefreshCw className="mr-1.5" size={12} />
            Retry
          </Button>
          <Button
            className="h-8 px-3 text-xs"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            variant="outline"
          >
            <Icons.ExternalLink className="mr-1.5" size={12} />
            Download
          </Button>
        </div>
      </div>
    );
  }

  if (state === "loading" || !workbook) {
    return <SpreadsheetSkeleton />;
  }

  const colCount = data.reduce((max, row) => Math.max(max, row.length), 0);
  const rowCount = data.length;

  return (
    <TooltipProvider delayDuration={300}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/noNoninteractiveElementInteractions: Mouse tracking for auto-hide toolbar */}
      <div
        className="relative flex h-full flex-col"
        onMouseMove={resetHideTimer}
      >
        <SpreadsheetToolbar
          activeSheet={activeSheet}
          colCount={colCount}
          onSheetChange={setActiveSheet}
          rowCount={rowCount}
          sheets={workbook.SheetNames}
          visible={showControls}
        />

        <div
          className="flex-1 overflow-auto pb-20"
          onScroll={resetHideTimer}
          ref={containerRef}
        >
          <SpreadsheetTable data={data} />
        </div>
      </div>
    </TooltipProvider>
  );
}

type SpreadsheetTableProps = {
  data: CellValue[][];
};

function SpreadsheetTable({ data }: SpreadsheetTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-foreground/50 text-sm">Empty spreadsheet</p>
      </div>
    );
  }

  const headerRow = data[0] ?? [];
  const bodyRows = data.slice(1);
  const colCount = data.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="p-4">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted/80 backdrop-blur-sm">
            <th className="w-12 border border-border/50 bg-muted/90 px-2 py-1.5 text-center font-medium text-foreground/50">
              #
            </th>
            {Array.from({ length: colCount }, (_, i) => (
              <th
                className="min-w-24 border border-border/50 bg-muted/90 px-2 py-1.5 text-left font-medium"
                key={i}
              >
                {formatCellValue(headerRow[i])}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr className="transition-colors hover:bg-muted/30" key={rowIndex}>
              <td className="border border-border/30 bg-muted/20 px-2 py-1.5 text-center font-medium text-foreground/40 tabular-nums">
                {rowIndex + 2}
              </td>
              {Array.from({ length: colCount }, (_, colIndex) => {
                const value = row[colIndex];
                const isNumeric = typeof value === "number";
                return (
                  <td
                    className={cn(
                      "border border-border/30 px-2 py-1.5",
                      isNumeric && "text-right tabular-nums"
                    )}
                    key={colIndex}
                  >
                    {formatCellValue(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellValue(value: CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  return String(value);
}

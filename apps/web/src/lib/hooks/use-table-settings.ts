"use client";

import {
  createLocalStorageAdapter,
  createNoopStorageAdapter,
  type StorageAdapterSync,
} from "@openbeam/ui/stores";
import type {
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

interface TableSettings extends Record<string, unknown> {
  columns: VisibilityState;
  sizing: ColumnSizingState;
  order: ColumnOrderState;
}

interface UseTableSettingsProps {
  tableId: string;
  initialSettings?: Partial<TableSettings>;
}

const DEBOUNCE_MS = 300;

const tableSettingsSchema = z.object({
  columns: z.record(z.string(), z.boolean()),
  sizing: z.record(z.string(), z.number()),
  order: z.array(z.string()),
});

const partialTableSettingsSchema = tableSettingsSchema.partial();

type TableSettingsStorage = Pick<StorageAdapterSync, "getItem" | "setItem">;

function getStorageKey(tableId: string) {
  return `table-settings-${tableId}`;
}

function loadSettings(
  tableId: string,
  storage: TableSettingsStorage
): Partial<TableSettings> | null {
  try {
    const raw = storage.getItem(getStorageKey(tableId));
    const parsed = partialTableSettingsSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function resolveStorageAdapter(): TableSettingsStorage {
  return typeof window === "undefined"
    ? createNoopStorageAdapter()
    : createLocalStorageAdapter();
}

export function useTableSettings({
  tableId,
  initialSettings,
}: UseTableSettingsProps) {
  const storage = useMemo(resolveStorageAdapter, []);
  const stored = useMemo(
    () => loadSettings(tableId, storage),
    [storage, tableId]
  );

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    stored?.columns ?? initialSettings?.columns ?? {}
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
    stored?.sizing ?? initialSettings?.sizing ?? {}
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    stored?.order ?? initialSettings?.order ?? []
  );

  const isInitialMount = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSettings = useCallback(
    (
      visibility: VisibilityState,
      sizing: ColumnSizingState,
      order: ColumnOrderState
    ) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const settings: TableSettings = {
          columns: visibility,
          sizing,
          order,
        };
        storage.setItem(getStorageKey(tableId), settings);
      }, DEBOUNCE_MS);
    },
    [storage, tableId]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    persistSettings(columnVisibility, columnSizing, columnOrder);
  }, [columnVisibility, columnSizing, columnOrder, persistSettings]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  return {
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
  };
}

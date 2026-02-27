"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardLayout, DashboardPanel } from "../types";

type UseDashboardOptions = {
  initialLayout: DashboardLayout;
  onRefresh?: () => Promise<DashboardLayout>;
};

export function useDashboard({
  initialLayout,
  onRefresh,
}: UseDashboardOptions) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!onRefresh || isRefreshingRef.current) {
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const updated = await onRefresh();
      setLayout(updated);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!(layout.refreshInterval && onRefresh)) {
      return;
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, layout.refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [layout.refreshInterval, onRefresh, refresh]);

  const updatePanel = useCallback(
    (panelId: string, updates: Partial<DashboardPanel>) => {
      setLayout((prev) => ({
        ...prev,
        panels: prev.panels.map((p) =>
          p.id === panelId ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setLayout((prev) => ({
      ...prev,
      panels: prev.panels.filter((p) => p.id !== panelId),
    }));
  }, []);

  const addPanel = useCallback((panel: DashboardPanel) => {
    setLayout((prev) => ({
      ...prev,
      panels: [...prev.panels, panel],
    }));
  }, []);

  return {
    layout,
    isRefreshing,
    refresh,
    updatePanel,
    removePanel,
    addPanel,
  };
}

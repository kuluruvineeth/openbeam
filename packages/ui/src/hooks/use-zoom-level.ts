"use client";

import { useStore } from "@xyflow/react";
import { useMemo } from "react";

const ZOOM_THRESHOLDS = {
  detail: 0.75,
  compact: 0.4,
} as const;

type ZoomLevel = "detail" | "compact" | "minimap";

interface UseZoomLevelReturn {
  level: ZoomLevel;
  showCompact: boolean;
  showDetail: boolean;
}

function getZoomLevel(zoom: number): ZoomLevel {
  if (zoom >= ZOOM_THRESHOLDS.detail) {
    return "detail";
  }
  if (zoom >= ZOOM_THRESHOLDS.compact) {
    return "compact";
  }
  return "minimap";
}

export function useZoomLevel(): UseZoomLevelReturn {
  const zoom = useStore((s) => s.transform[2]);

  return useMemo(() => {
    const level = getZoomLevel(zoom);
    return {
      level,
      showDetail: level === "detail",
      showCompact: level === "detail" || level === "compact",
    };
  }, [zoom]);
}

export { ZOOM_THRESHOLDS };
export type { UseZoomLevelReturn, ZoomLevel };

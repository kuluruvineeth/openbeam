import { describe, expect, it } from "bun:test";

import { ZOOM_THRESHOLDS } from "../use-zoom-level";

function getZoomLevel(zoom: number): "detail" | "compact" | "minimap" {
  if (zoom >= ZOOM_THRESHOLDS.detail) {
    return "detail";
  }
  if (zoom >= ZOOM_THRESHOLDS.compact) {
    return "compact";
  }
  return "minimap";
}

function deriveFlags(level: "detail" | "compact" | "minimap"): {
  showDetail: boolean;
  showCompact: boolean;
} {
  return {
    showDetail: level === "detail",
    showCompact: level === "detail" || level === "compact",
  };
}

describe("getZoomLevel", () => {
  it("returns detail at the exact detail threshold", () => {
    expect(getZoomLevel(ZOOM_THRESHOLDS.detail)).toBe("detail");
  });

  it("returns detail above the detail threshold", () => {
    expect(getZoomLevel(1.0)).toBe("detail");
    expect(getZoomLevel(2.5)).toBe("detail");
  });

  it("returns compact at the exact compact threshold", () => {
    expect(getZoomLevel(ZOOM_THRESHOLDS.compact)).toBe("compact");
  });

  it("returns compact between compact and detail thresholds", () => {
    expect(getZoomLevel(0.5)).toBe("compact");
    expect(getZoomLevel(0.6)).toBe("compact");
  });

  it("returns minimap below compact threshold", () => {
    expect(getZoomLevel(0.3)).toBe("minimap");
    expect(getZoomLevel(0.1)).toBe("minimap");
  });

  it("returns minimap at zero zoom", () => {
    expect(getZoomLevel(0)).toBe("minimap");
  });

  it("returns detail for very large zoom values", () => {
    expect(getZoomLevel(100)).toBe("detail");
  });

  it("returns minimap for negative zoom values", () => {
    expect(getZoomLevel(-1)).toBe("minimap");
  });

  it("handles boundary just below detail threshold", () => {
    expect(getZoomLevel(ZOOM_THRESHOLDS.detail - 0.001)).toBe("compact");
  });

  it("handles boundary just below compact threshold", () => {
    expect(getZoomLevel(ZOOM_THRESHOLDS.compact - 0.001)).toBe("minimap");
  });
});

describe("zoom level derived flags", () => {
  it("sets showDetail true only for detail level", () => {
    expect(deriveFlags("detail").showDetail).toBe(true);
    expect(deriveFlags("compact").showDetail).toBe(false);
    expect(deriveFlags("minimap").showDetail).toBe(false);
  });

  it("sets showCompact true for detail and compact levels", () => {
    expect(deriveFlags("detail").showCompact).toBe(true);
    expect(deriveFlags("compact").showCompact).toBe(true);
    expect(deriveFlags("minimap").showCompact).toBe(false);
  });
});

describe("ZOOM_THRESHOLDS", () => {
  it("has detail threshold greater than compact threshold", () => {
    expect(ZOOM_THRESHOLDS.detail).toBeGreaterThan(ZOOM_THRESHOLDS.compact);
  });

  it("has positive threshold values", () => {
    expect(ZOOM_THRESHOLDS.detail).toBeGreaterThan(0);
    expect(ZOOM_THRESHOLDS.compact).toBeGreaterThan(0);
  });
});

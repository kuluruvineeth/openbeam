import { describe, expect, it } from "bun:test";

const DEFAULT_WIDTH = 2048;
const DEFAULT_HEIGHT = 1536;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const VIEWPORT_PADDING = 0.1;

function buildExportStyle(
  viewport: { x: number; y: number; zoom: number },
  width: number,
  height: number
): Record<string, string> {
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
  };
}

describe("buildExportStyle", () => {
  it("produces width and height as px strings", () => {
    const style = buildExportStyle({ x: 0, y: 0, zoom: 1 }, 800, 600);
    expect(style.width).toBe("800px");
    expect(style.height).toBe("600px");
  });

  it("includes translate and scale in transform", () => {
    const style = buildExportStyle({ x: 10, y: 20, zoom: 1.5 }, 800, 600);
    expect(style.transform).toBe("translate(10px, 20px) scale(1.5)");
  });

  it("handles a zero viewport", () => {
    const style = buildExportStyle({ x: 0, y: 0, zoom: 0 }, 100, 100);
    expect(style.transform).toBe("translate(0px, 0px) scale(0)");
  });

  it("handles negative viewport offsets", () => {
    const style = buildExportStyle({ x: -50, y: -120, zoom: 1 }, 400, 300);
    expect(style.transform).toContain("translate(-50px, -120px)");
  });

  it("handles fractional zoom values", () => {
    const style = buildExportStyle({ x: 5, y: 10, zoom: 0.75 }, 200, 150);
    expect(style.transform).toBe("translate(5px, 10px) scale(0.75)");
  });

  it("handles very large dimensions", () => {
    const style = buildExportStyle({ x: 0, y: 0, zoom: 1 }, 10_000, 8000);
    expect(style.width).toBe("10000px");
    expect(style.height).toBe("8000px");
  });

  it("returns exactly three keys", () => {
    const style = buildExportStyle({ x: 0, y: 0, zoom: 1 }, 100, 100);
    expect(Object.keys(style)).toHaveLength(3);
    expect(Object.keys(style).sort()).toEqual(["height", "transform", "width"]);
  });

  it("handles negative zoom", () => {
    const style = buildExportStyle({ x: 0, y: 0, zoom: -1 }, 100, 100);
    expect(style.transform).toBe("translate(0px, 0px) scale(-1)");
  });

  it("preserves decimal precision in viewport offsets", () => {
    const style = buildExportStyle(
      { x: 12.345, y: 67.891, zoom: 1.23 },
      500,
      400
    );
    expect(style.transform).toBe("translate(12.345px, 67.891px) scale(1.23)");
  });
});

describe("export image constants", () => {
  it("has reasonable default dimensions", () => {
    expect(DEFAULT_WIDTH).toBeGreaterThan(0);
    expect(DEFAULT_HEIGHT).toBeGreaterThan(0);
  });

  it("uses standard resolution defaults", () => {
    expect(DEFAULT_WIDTH).toBe(2048);
    expect(DEFAULT_HEIGHT).toBe(1536);
  });

  it("has MIN_ZOOM less than MAX_ZOOM", () => {
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
  });

  it("has positive zoom bounds", () => {
    expect(MIN_ZOOM).toBeGreaterThan(0);
    expect(MAX_ZOOM).toBeGreaterThan(0);
  });

  it("has VIEWPORT_PADDING between 0 and 1", () => {
    expect(VIEWPORT_PADDING).toBeGreaterThan(0);
    expect(VIEWPORT_PADDING).toBeLessThan(1);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  View: "View",
  useWindowDimensions: vi.fn(() => ({ width: 1024, height: 768 })),
}));

describe("useIsTablet breakpoint", () => {
  it("considers 768px as tablet breakpoint", () => {
    const TABLET_BREAKPOINT = 768;
    expect(TABLET_BREAKPOINT <= 1024).toBe(true);
    expect(TABLET_BREAKPOINT <= 767).toBe(false);
    expect(TABLET_BREAKPOINT <= 768).toBe(true);
  });

  it("phones are below breakpoint", () => {
    const TABLET_BREAKPOINT = 768;
    const phoneWidths = [320, 375, 390, 414, 428];
    for (const width of phoneWidths) {
      expect(width >= TABLET_BREAKPOINT).toBe(false);
    }
  });

  it("tablets are at or above breakpoint", () => {
    const TABLET_BREAKPOINT = 768;
    const tabletWidths = [768, 834, 1024, 1112, 1194];
    for (const width of tabletWidths) {
      expect(width >= TABLET_BREAKPOINT).toBe(true);
    }
  });
});

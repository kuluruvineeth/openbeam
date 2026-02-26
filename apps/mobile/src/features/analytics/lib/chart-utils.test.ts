import { describe, expect, it } from "vitest";
import {
  calculateTrendPercent,
  coerceNumericData,
  formatChartLabel,
  formatChartValue,
  formatCurrency,
  formatPercent,
  resolveColors,
  resolveXKey,
  resolveYKeys,
} from "./chart-utils";

describe("formatChartValue", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatChartValue(null)).toBe("");
    expect(formatChartValue(undefined)).toBe("");
  });

  it("formats millions", () => {
    expect(formatChartValue(2_500_000)).toBe("2.5M");
    expect(formatChartValue(-1_000_000)).toBe("-1.0M");
  });

  it("formats thousands", () => {
    expect(formatChartValue(5400)).toBe("5.4K");
    expect(formatChartValue(1000)).toBe("1.0K");
  });

  it("formats integers", () => {
    expect(formatChartValue(42)).toBe("42");
    expect(formatChartValue(0)).toBe("0");
  });

  it("formats decimals", () => {
    expect(formatChartValue(Math.PI)).toBe("3.14");
  });

  it("stringifies objects", () => {
    expect(formatChartValue({ a: 1 })).toBe('{"a":1}');
  });

  it("converts other types to string", () => {
    expect(formatChartValue("hello")).toBe("hello");
    expect(formatChartValue(true)).toBe("true");
  });
});

describe("formatChartLabel", () => {
  it("returns empty string for null/undefined", () => {
    expect(formatChartLabel(null)).toBe("");
    expect(formatChartLabel(undefined)).toBe("");
  });

  it("truncates ISO date strings", () => {
    expect(formatChartLabel("2024-01-15T12:00:00Z")).toBe("2024-01-15");
  });

  it("truncates long strings with ellipsis", () => {
    const long = "This is a very long label that exceeds twenty chars";
    const result = formatChartLabel(long);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result.endsWith("...")).toBe(true);
  });

  it("preserves short strings", () => {
    expect(formatChartLabel("Short")).toBe("Short");
  });
});

describe("formatCurrency", () => {
  it("formats USD currency", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatPercent", () => {
  it("formats percentage", () => {
    expect(formatPercent(75.3)).toBe("75.3%");
    expect(formatPercent(100)).toBe("100.0%");
  });
});

describe("calculateTrendPercent", () => {
  it("calculates positive trend", () => {
    expect(calculateTrendPercent(150, 100)).toBe(50);
  });

  it("calculates negative trend", () => {
    expect(calculateTrendPercent(50, 100)).toBe(-50);
  });

  it("handles zero previous value", () => {
    expect(calculateTrendPercent(100, 0)).toBe(100);
    expect(calculateTrendPercent(0, 0)).toBe(0);
  });

  it("handles no change", () => {
    expect(calculateTrendPercent(100, 100)).toBe(0);
  });
});

describe("resolveXKey", () => {
  it("uses config xField if provided", () => {
    expect(resolveXKey([{ a: 1, b: 2 }], { xField: "a" })).toBe("a");
  });

  it("falls back to first key", () => {
    expect(resolveXKey([{ month: "Jan", value: 10 }], {})).toBe("month");
  });

  it("returns x for empty data", () => {
    expect(resolveXKey([], {})).toBe("x");
  });
});

describe("resolveYKeys", () => {
  it("uses yFields if provided", () => {
    expect(resolveYKeys([{}], { yFields: ["a", "b"] })).toEqual(["a", "b"]);
  });

  it("uses yField if provided", () => {
    expect(resolveYKeys([{}], { yField: "val" })).toEqual(["val"]);
  });

  it("infers from data keys excluding xField", () => {
    const data = [{ month: "Jan", sales: 100, profit: 50 }];
    const keys = resolveYKeys(data, { xField: "month" });
    expect(keys).toEqual(["sales", "profit"]);
  });
});

describe("coerceNumericData", () => {
  it("converts string numbers to numbers", () => {
    const data = [{ x: "Jan", y: "100" }];
    const result = coerceNumericData(data, { yField: "y" });
    expect(result[0].y).toBe(100);
    expect(result[0].x).toBe("Jan");
  });

  it("returns empty array for empty input", () => {
    expect(coerceNumericData([], {})).toEqual([]);
  });

  it("preserves non-numeric strings", () => {
    const data = [{ x: "Jan", y: "hello" }];
    const result = coerceNumericData(data, { yField: "y" });
    expect(result[0].y).toBe("hello");
  });
});

describe("resolveColors", () => {
  it("uses config colors when provided", () => {
    const result = resolveColors({ colors: ["#ff0000"] }, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("#ff0000");
  });

  it("cycles through palette", () => {
    const result = resolveColors({}, 2);
    expect(result).toHaveLength(2);
  });
});

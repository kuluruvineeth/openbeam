import { describe, expect, it } from "bun:test";
import { computeBudgetThreshold, formatCents } from "../../lib/budget-utils";

describe("computeBudgetThreshold", () => {
  it("returns safe when percentage is below 70", () => {
    expect(computeBudgetThreshold(50, 100)).toBe("safe");
  });

  it("returns warning when percentage is between 70 and 89", () => {
    expect(computeBudgetThreshold(75, 100)).toBe("warning");
  });

  it("returns danger when percentage is between 90 and 99", () => {
    expect(computeBudgetThreshold(95, 100)).toBe("danger");
  });

  it("returns exceeded when percentage is above 100", () => {
    expect(computeBudgetThreshold(105, 100)).toBe("exceeded");
  });

  it("returns safe when percentage is 0", () => {
    expect(computeBudgetThreshold(0, 100)).toBe("safe");
  });

  it("returns danger when consumed equals budget exactly", () => {
    expect(computeBudgetThreshold(100, 100)).toBe("danger");
  });

  it("returns warning when percentage is exactly 70", () => {
    expect(computeBudgetThreshold(70, 100)).toBe("warning");
  });

  it("returns danger when percentage is exactly 90", () => {
    expect(computeBudgetThreshold(90, 100)).toBe("danger");
  });

  it("returns exceeded when budget is 0 and consumed is positive", () => {
    expect(computeBudgetThreshold(10, 0)).toBe("exceeded");
  });

  it("returns safe when both budget and consumed are 0", () => {
    expect(computeBudgetThreshold(0, 0)).toBe("safe");
  });
});

describe("formatCents", () => {
  it("formats 0 as $0.00", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats 1234 as $12.34", () => {
    expect(formatCents(1234)).toBe("$12.34");
  });

  it("formats 100 as $1.00", () => {
    expect(formatCents(100)).toBe("$1.00");
  });

  it("formats 99999 as $999.99", () => {
    expect(formatCents(99_999)).toBe("$999.99");
  });

  it("formats negative values with minus prefix", () => {
    expect(formatCents(-500)).toBe("-$5.00");
  });
});

import { CHART_PALETTE } from "../constants";
import type { ChartConfig, ChartData } from "../types";

export function formatChartValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  if (typeof val === "number") {
    if (Math.abs(val) >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return String(val);
}

export function formatChartLabel(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val);
  if (str.length > 16 && !Number.isNaN(Date.parse(str))) {
    return str.slice(0, 10);
  }
  if (str.length > 20) {
    return `${str.slice(0, 18)}...`;
  }
  return str;
}

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function coerceNumericData(
  data: ChartData,
  config: ChartConfig
): ChartData {
  if (data.length === 0) {
    return [];
  }

  const numericKeys = new Set<string>();
  if (config.yField) {
    numericKeys.add(config.yField);
  }
  if (config.yFields) {
    for (const key of config.yFields) {
      numericKeys.add(key);
    }
  }
  if (config.valueKey) {
    numericKeys.add(config.valueKey);
  }

  if (numericKeys.size === 0) {
    return data;
  }

  return data.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const key of numericKeys) {
      if (key in out) {
        const v = out[key];
        if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) {
          out[key] = Number(v);
        }
      }
    }
    return out;
  });
}

export function resolveYKeys(data: ChartData, config: ChartConfig): string[] {
  if (config.yFields && config.yFields.length > 0) {
    return config.yFields;
  }
  if (config.yField) {
    return [config.yField];
  }

  const firstRow = data[0];
  if (!firstRow) {
    return [];
  }

  const xKey = config.xField ?? Object.keys(firstRow)[0] ?? "x";
  return Object.keys(firstRow).filter((k) => k !== xKey);
}

export function resolveXKey(data: ChartData, config: ChartConfig): string {
  if (config.xField) {
    return config.xField;
  }
  return Object.keys(data[0] ?? {})[0] ?? "x";
}

export function resolveColors(config: ChartConfig, count: number): string[] {
  const base = config.colors ?? CHART_PALETTE;
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
}

export function calculateTrendPercent(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

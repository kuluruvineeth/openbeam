export type MetricLabels = Record<string, string>;

function labelKey(labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return "";
  }
  return JSON.stringify(
    Object.keys(labels)
      .sort()
      .reduce<Record<string, string>>((acc, k) => {
        acc[k] = labels[k] ?? "";
        return acc;
      }, {})
  );
}

export class InMemoryGauge {
  private readonly values = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  set(value: number, labels?: MetricLabels): void {
    this.values.set(labelKey(labels), value);
  }

  inc(labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + 1);
  }

  dec(labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - 1);
  }

  get(labels?: MetricLabels): number {
    return this.values.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.values.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }
}

export class InMemoryCounter {
  private readonly values = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels?: MetricLabels, amount = 1): void {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + amount);
  }

  get(labels?: MetricLabels): number {
    return this.values.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.values.clear();
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }
}

export class InMemoryHistogram {
  private readonly counts = new Map<string, number>();
  private readonly sums = new Map<string, number>();
  readonly name: string;
  readonly help: string;
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  observe(value: number, labels?: MetricLabels): void {
    const key = labelKey(labels);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    this.sums.set(key, (this.sums.get(key) ?? 0) + value);
  }

  getCount(labels?: MetricLabels): number {
    return this.counts.get(labelKey(labels)) ?? 0;
  }

  getSum(labels?: MetricLabels): number {
    return this.sums.get(labelKey(labels)) ?? 0;
  }

  reset(): void {
    this.counts.clear();
    this.sums.clear();
  }

  snapshot(): { counts: Record<string, number>; sums: Record<string, number> } {
    return {
      counts: Object.fromEntries(this.counts),
      sums: Object.fromEntries(this.sums),
    };
  }
}

const noop = Function.prototype as () => void;

export function resetAllMetrics(): void {
  noop();
}

export function snapshotMetrics(): Record<string, unknown> {
  return {};
}

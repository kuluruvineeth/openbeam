import {
  Counter,
  type CounterConfiguration,
  collectDefaultMetrics,
  register as defaultRegistry,
  Gauge,
  type GaugeConfiguration,
  Histogram,
  type HistogramConfiguration,
  type Metric,
  Registry,
} from "prom-client";

const defaultMetricsRegistries = new WeakSet<Registry>();

export interface CreateRegistryOptions {
  defaultLabels?: Record<string, string>;
}

export interface CollectProcessMetricsOptions {
  labels?: Record<string, string>;
}

export interface HttpMetricLabelInput {
  method: string;
  route: string;
  statusCode: number | string;
  service?: string;
  env?: string;
  component?: string;
  connectorType?: string;
  workerType?: string;
}

type MetricKind = "counter" | "gauge" | "histogram";

function getMetricType(metric: Metric<string>): MetricKind | "unknown" {
  if (metric instanceof Counter) {
    return "counter";
  }

  if (metric instanceof Gauge) {
    return "gauge";
  }

  if (metric instanceof Histogram) {
    return "histogram";
  }

  return "unknown";
}

function ensureMetricType<TMetric extends Metric<string>>(
  registry: Registry,
  name: string,
  expectedKind: MetricKind,
  guard: (metric: Metric<string>) => metric is TMetric
): TMetric | undefined {
  const existing = registry.getSingleMetric(name);

  if (!existing) {
    return;
  }

  if (guard(existing)) {
    return existing;
  }

  const actualKind = getMetricType(existing);

  throw new Error(
    `Metric "${name}" already registered as ${actualKind}; expected ${expectedKind}`
  );
}

function resolveMetricTargets(
  registry: Registry | undefined,
  registers: readonly Registry[] | undefined
): {
  primaryRegistry: Registry;
  registers: Registry[];
} {
  if (registers && registers.length > 0) {
    return {
      primaryRegistry: registry ?? registers[0] ?? defaultRegistry,
      registers: [...registers],
    };
  }

  if (registry) {
    return {
      primaryRegistry: registry,
      registers: [registry],
    };
  }

  return {
    primaryRegistry: defaultRegistry,
    registers: [defaultRegistry],
  };
}

function registerMetricAcrossTargets<TMetric extends Metric<string>>(
  metric: TMetric,
  registers: Registry[]
): TMetric {
  for (const targetRegistry of registers) {
    targetRegistry.registerMetric(metric);
  }

  return metric;
}

export function createRegistry(options: CreateRegistryOptions = {}): Registry {
  const registry = new Registry();

  if (options.defaultLabels && Object.keys(options.defaultLabels).length > 0) {
    registry.setDefaultLabels(options.defaultLabels);
  }

  return registry;
}

export function collectProcessMetrics(
  registry: Registry,
  options: CollectProcessMetricsOptions = {}
): void {
  if (defaultMetricsRegistries.has(registry)) {
    return;
  }

  collectDefaultMetrics({
    register: registry,
    labels: options.labels,
  });

  defaultMetricsRegistries.add(registry);
}

export function safeCounter<TLabel extends string>(
  configuration: CounterConfiguration<TLabel>,
  registry?: Registry
): Counter<TLabel> {
  const { primaryRegistry, registers } = resolveMetricTargets(
    registry,
    configuration.registers as readonly Registry[] | undefined
  );
  const existing = ensureMetricType(
    primaryRegistry,
    configuration.name,
    "counter",
    (metric): metric is Counter<string> => metric instanceof Counter
  );

  if (existing) {
    return existing as Counter<TLabel>;
  }

  return registerMetricAcrossTargets(
    new Counter({
      ...configuration,
      registers: [],
    }),
    registers
  ) as Counter<TLabel>;
}

export function safeGauge<TLabel extends string>(
  configuration: GaugeConfiguration<TLabel>,
  registry?: Registry
): Gauge<TLabel> {
  const { primaryRegistry, registers } = resolveMetricTargets(
    registry,
    configuration.registers as readonly Registry[] | undefined
  );
  const existing = ensureMetricType(
    primaryRegistry,
    configuration.name,
    "gauge",
    (metric): metric is Gauge<string> => metric instanceof Gauge
  );

  if (existing) {
    return existing as Gauge<TLabel>;
  }

  return registerMetricAcrossTargets(
    new Gauge({
      ...configuration,
      registers: [],
    }),
    registers
  ) as Gauge<TLabel>;
}

export function safeHistogram<TLabel extends string>(
  configuration: HistogramConfiguration<TLabel>,
  registry?: Registry
): Histogram<TLabel> {
  const { primaryRegistry, registers } = resolveMetricTargets(
    registry,
    configuration.registers as readonly Registry[] | undefined
  );
  const existing = ensureMetricType(
    primaryRegistry,
    configuration.name,
    "histogram",
    (metric): metric is Histogram<string> => metric instanceof Histogram
  );

  if (existing) {
    return existing as Histogram<TLabel>;
  }

  return registerMetricAcrossTargets(
    new Histogram({
      ...configuration,
      registers: [],
    }),
    registers
  ) as Histogram<TLabel>;
}

export function buildHttpMetricLabels(
  input: HttpMetricLabelInput
): Record<string, string> {
  const labels: Record<string, string> = {
    method: input.method,
    route: input.route,
    status_code: String(input.statusCode),
  };

  if (input.service) {
    labels.service = input.service;
  }

  if (input.env) {
    labels.env = input.env;
  }

  if (input.component) {
    labels.component = input.component;
  }

  if (input.connectorType) {
    labels.connector_type = input.connectorType;
  }

  if (input.workerType) {
    labels.worker_type = input.workerType;
  }

  return labels;
}

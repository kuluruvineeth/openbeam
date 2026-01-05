export type QueryRoute = "vespa" | "duckdb" | "hybrid";

export interface RoutingDecision {
  route: QueryRoute;
  confidence: number;
  reason: string;
  spreadsheetId?: string;
  analyticalSignals?: string[];
}

export interface RoutingContext {
  hasSpreadsheet?: boolean;
  spreadsheetId?: string;
  spreadsheetName?: string;
  availableColumns?: string[];
}

const ANALYTICAL_PATTERNS = [
  { pattern: /\b(average|avg|mean)\b/i, signal: "average" },
  { pattern: /\b(sum|total)\b/i, signal: "sum" },
  { pattern: /\b(count|how many)\b/i, signal: "count" },
  { pattern: /\b(min|minimum|smallest|lowest)\b/i, signal: "min" },
  { pattern: /\b(max|maximum|largest|highest|biggest)\b/i, signal: "max" },
  { pattern: /\b(median)\b/i, signal: "median" },
  { pattern: /\b(std|standard deviation|variance)\b/i, signal: "stddev" },
  { pattern: /\b(percentile|quartile)\b/i, signal: "percentile" },
  { pattern: /\b(group by|grouped|breakdown|by each)\b/i, signal: "groupby" },
  { pattern: /\b(filter|where|only|exclude)\b/i, signal: "filter" },
  { pattern: /\b(sort|order|rank|top|bottom)\b/i, signal: "sort" },
  { pattern: /\b(compare|difference|vs|versus)\b/i, signal: "compare" },
  { pattern: /\b(trend|over time|growth|change)\b/i, signal: "trend" },
  { pattern: /\b(pivot|cross-tab|crosstab)\b/i, signal: "pivot" },
  { pattern: /\b(distinct|unique)\b/i, signal: "distinct" },
];

const SPREADSHEET_KEYWORDS = [
  /\bspreadsheet\b/i,
  /\bexcel\b/i,
  /\bcsv\b/i,
  /\bworksheet\b/i,
  /\brows?\b/i,
  /\bcolumns?\b/i,
  /\bcells?\b/i,
  /\bsheet\b/i,
  /\btable data\b/i,
];

const DISCOVERY_PATTERNS = [
  /\bfind\s+documents?\b/i,
  /\bsearch\s+for\b/i,
  /\bwho\s+(wrote|created|authored)\b/i,
  /\bwhat\s+is\b/i,
  /\bwhere\s+can\s+i\s+find\b/i,
  /\bshow\s+me\s+documents?\b/i,
  /\blist\s+files?\b/i,
  /\brelated\s+to\b/i,
  /\babout\b/i,
  /\bmeaning\s+of\b/i,
  /\bexplain\b/i,
  /\bdefinition\b/i,
];

const AGGREGATION_SIGNALS = new Set([
  "average",
  "sum",
  "count",
  "min",
  "max",
  "median",
  "stddev",
  "percentile",
]);

const SIGNAL_SCORES: Record<string, number> = {
  groupby: 0.2,
  filter: 0.15,
  sort: 0.1,
  compare: 0.15,
  trend: 0.2,
  pivot: 0.25,
  distinct: 0.1,
};

function extractAnalyticalSignals(query: string): string[] {
  const signals: string[] = [];
  for (const { pattern, signal } of ANALYTICAL_PATTERNS) {
    if (pattern.test(query)) {
      signals.push(signal);
    }
  }
  return signals;
}

function hasSpreadsheetReference(query: string): boolean {
  return SPREADSHEET_KEYWORDS.some((pattern) => pattern.test(query));
}

function hasDiscoveryIntent(query: string): boolean {
  return DISCOVERY_PATTERNS.some((pattern) => pattern.test(query));
}

function computeAnalyticalScore(signals: string[]): number {
  if (signals.length === 0) {
    return 0;
  }

  let score = 0;

  const hasAggregation = signals.some((s) => AGGREGATION_SIGNALS.has(s));
  if (hasAggregation) {
    score += 0.4;
  }

  for (const signal of signals) {
    const signalScore = SIGNAL_SCORES[signal];
    if (signalScore !== undefined) {
      score += signalScore;
    }
  }

  return Math.min(score, 1);
}

export function routeQuery(
  query: string,
  context?: RoutingContext
): RoutingDecision {
  const analyticalSignals = extractAnalyticalSignals(query);
  const analyticalScore = computeAnalyticalScore(analyticalSignals);
  const spreadsheetRef = hasSpreadsheetReference(query);
  const discoveryIntent = hasDiscoveryIntent(query);

  const hasExplicitSpreadsheet = context?.hasSpreadsheet ?? false;
  const spreadsheetId = context?.spreadsheetId;

  if (hasExplicitSpreadsheet && analyticalScore >= 0.3) {
    return {
      route: "duckdb",
      confidence: Math.min(0.6 + analyticalScore, 0.95),
      reason: `Analytical query on spreadsheet: ${analyticalSignals.join(", ")}`,
      spreadsheetId,
      analyticalSignals,
    };
  }

  if (analyticalScore >= 0.5 && spreadsheetRef) {
    return {
      route: "duckdb",
      confidence: 0.7 + analyticalScore * 0.2,
      reason: `Strong analytical signals with spreadsheet reference: ${analyticalSignals.join(", ")}`,
      spreadsheetId,
      analyticalSignals,
    };
  }

  if (discoveryIntent && analyticalScore < 0.3) {
    return {
      route: "vespa",
      confidence: 0.85,
      reason: "Discovery query - searching for documents/information",
    };
  }

  if (analyticalScore >= 0.4 && (spreadsheetRef || hasExplicitSpreadsheet)) {
    return {
      route: "hybrid",
      confidence: 0.6,
      reason: `Mixed intent: analytical (${analyticalSignals.join(", ")}) with potential discovery`,
      spreadsheetId,
      analyticalSignals,
    };
  }

  if (hasExplicitSpreadsheet && analyticalScore < 0.3) {
    return {
      route: "hybrid",
      confidence: 0.5,
      reason: "Spreadsheet context present but query may need document search",
      spreadsheetId,
    };
  }

  return {
    route: "vespa",
    confidence: 0.8,
    reason: "Default to semantic search for general queries",
  };
}

export function shouldUseDuckDB(decision: RoutingDecision): boolean {
  return decision.route === "duckdb" || decision.route === "hybrid";
}

export function shouldUseVespa(decision: RoutingDecision): boolean {
  return decision.route === "vespa" || decision.route === "hybrid";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) {
    return "high";
  }
  if (confidence >= 0.5) {
    return "medium";
  }
  return "low";
}

export function getRoutingExplanation(decision: RoutingDecision): string {
  const confidenceLabel = getConfidenceLabel(decision.confidence);

  switch (decision.route) {
    case "duckdb":
      return `Routing to DuckDB for analytical query (${confidenceLabel} confidence). ${decision.reason}`;
    case "vespa":
      return `Routing to Vespa for semantic search (${confidenceLabel} confidence). ${decision.reason}`;
    case "hybrid":
      return `Using hybrid approach (${confidenceLabel} confidence). ${decision.reason}`;
    default:
      return `Unknown route (${confidenceLabel} confidence). ${decision.reason}`;
  }
}

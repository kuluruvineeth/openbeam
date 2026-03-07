#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const usage = `Usage:
  bun run observability:new-metric -- --name <metric_name> --type <counter|gauge|histogram> --labels <a,b,c|none> --help <metric help text> [--out <file>] [--register <var>] [--variable <metricVar>]

Example:
  bun run observability:new-metric -- --name openbeam_connector_sync_jobs_total --type counter --labels worker_type,status --help "Total connector sync jobs" --out apps/worker/src/metrics/openbeam-connector-sync-jobs-total.ts
`;

const LABEL_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const forbiddenLabels = new Set([
  "request_id",
  "trace_id",
  "span_id",
  "user_id",
  "team_id",
  "connector_id",
  "document_id",
  "file_id",
]);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const withoutPrefix = token.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");

    if (eqIndex >= 0) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      parsed[key] = value;
      continue;
    }

    const key = withoutPrefix;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function toCamelCase(metricName: string): string {
  const normalized = metricName
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const segments = normalized.split("_").filter(Boolean);

  if (segments.length === 0) {
    return "generatedMetric";
  }

  const [head, ...tail] = segments;
  return (
    head +
    tail
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join("")
  );
}

function escapeDoubleQuotes(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const argsSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_:][a-zA-Z0-9_:]*$/, {
    message:
      "Metric name must match Prometheus naming rules (letters, digits, _, :)",
  }),
  type: z.enum(["counter", "gauge", "histogram"]),
  labels: z.string().min(1),
  help: z.string().min(1),
  out: z.string().optional(),
  register: z
    .string()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)
    .default("register"),
  variable: z
    .string()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)
    .optional(),
});

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help === true) {
    console.log(usage);
    process.exit(0);
  }

  const parsedArgs = argsSchema.safeParse({
    name: cli.name,
    type: cli.type,
    labels: cli.labels,
    help: cli.help,
    out: typeof cli.out === "string" ? cli.out : undefined,
    register: typeof cli.register === "string" ? cli.register : "register",
    variable: typeof cli.variable === "string" ? cli.variable : undefined,
  });

  if (!parsedArgs.success) {
    console.error(
      parsedArgs.error.issues.map((issue) => issue.message).join("\n")
    );
    console.error(`\n${usage}`);
    process.exit(1);
  }

  const input = parsedArgs.data;
  const labels = input.labels
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  if (labels.length === 1 && labels[0].toLowerCase() === "none") {
    labels.length = 0;
  }

  const labelSchema = z.string().regex(LABEL_NAME_PATTERN, {
    message: "Label names must contain only letters, digits, and underscores",
  });

  for (const label of labels) {
    const valid = labelSchema.safeParse(label);
    if (!valid.success) {
      console.error(
        `Invalid label "${label}": ${valid.error.issues[0]?.message}`
      );
      process.exit(1);
    }
    if (forbiddenLabels.has(label)) {
      console.error(
        `Label "${label}" is forbidden for metrics due to high cardinality risk.`
      );
      process.exit(1);
    }
  }

  let constructorName: string;
  if (input.type === "counter") {
    constructorName = "Counter";
  } else if (input.type === "gauge") {
    constructorName = "Gauge";
  } else {
    constructorName = "Histogram";
  }

  const metricVar = input.variable ?? toCamelCase(input.name);
  const helpText = escapeDoubleQuotes(input.help);

  const lines: string[] = [];
  lines.push(`import { ${constructorName} } from "prom-client";`);
  lines.push("");
  lines.push(
    `// Requires \`${input.register}\` (prom-client Registry) in scope.`
  );

  if (labels.length > 0) {
    const labelsLiteral = labels.map((label) => `"${label}"`).join(", ");
    lines.push(`const labelNames = [${labelsLiteral}] as const;`);
    lines.push("type LabelName = (typeof labelNames)[number];");
    lines.push("");
    lines.push(
      `export const ${metricVar} = new ${constructorName}<LabelName>({`
    );
    lines.push(`  name: "${input.name}",`);
    lines.push(`  help: "${helpText}",`);
    lines.push("  labelNames,");
    if (input.type === "histogram") {
      lines.push("  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],");
    }
    lines.push(`  registers: [${input.register}],`);
    lines.push("});");
  } else {
    lines.push("");
    lines.push(`export const ${metricVar} = new ${constructorName}({`);
    lines.push(`  name: "${input.name}",`);
    lines.push(`  help: "${helpText}",`);
    if (input.type === "histogram") {
      lines.push("  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],");
    }
    lines.push(`  registers: [${input.register}],`);
    lines.push("});");
  }

  const output = `${lines.join("\n")}\n`;

  if (input.out) {
    const absolute = resolve(process.cwd(), input.out);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, output, "utf8");
    console.log(`Metric stub written: ${input.out}`);
  } else {
    console.log(output);
  }

  console.error(
    `Next step: wire \`${metricVar}\` into the target metrics module.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

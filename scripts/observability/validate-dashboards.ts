#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface GrafanaDashboard {
  uid?: string;
  title?: string;
  panels?: unknown[];
  templating?: {
    list?: Array<{
      name?: string;
    }>;
  };
}

const dashboardsDir = resolve(process.cwd(), "monitoring/grafana/dashboards");

const requiredDashboards = [
  "openbeam-command-center",
  "error-analysis",
  "platform-slo-overview",
  "logs-error-drilldown",
  "connector-sync-ops",
  "engine-performance",
];

const requiredVariablesByUid: Record<string, string[]> = {
  "openbeam-command-center": [
    "service",
    "env",
    "connector_type",
    "status_code",
  ],
  "error-analysis": ["service", "env", "connector_type", "status_code"],
  "platform-slo-overview": ["service", "env", "connector_type", "status_code"],
  "logs-error-drilldown": [
    "service",
    "env",
    "connector_type",
    "status_code",
    "trace_id",
    "request_id",
  ],
  "connector-sync-ops": ["service", "env", "connector_type", "status_code"],
  "engine-performance": ["service", "env", "connector_type", "status_code"],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function main(): Promise<void> {
  const files = (await readdir(dashboardsDir))
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error("No dashboard JSON files found.");
  }

  const seenUids = new Set<string>();
  const availableUids = new Set<string>();
  const errors: string[] = [];

  for (const file of files) {
    const fullPath = resolve(dashboardsDir, file);
    const contents = await readFile(fullPath, "utf8");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(contents);
    } catch (error) {
      errors.push(`${file}: invalid JSON (${(error as Error).message})`);
      continue;
    }

    if (!isObject(parsedJson)) {
      errors.push(`${file}: root must be an object`);
      continue;
    }

    const dashboard = parsedJson as GrafanaDashboard;

    if (!dashboard.uid || typeof dashboard.uid !== "string") {
      errors.push(`${file}: missing or invalid "uid"`);
      continue;
    }

    if (seenUids.has(dashboard.uid)) {
      errors.push(`${file}: duplicate uid "${dashboard.uid}"`);
      continue;
    }

    seenUids.add(dashboard.uid);
    availableUids.add(dashboard.uid);

    if (!dashboard.title || typeof dashboard.title !== "string") {
      errors.push(`${file}: missing or invalid "title"`);
    }

    if (!Array.isArray(dashboard.panels) || dashboard.panels.length === 0) {
      errors.push(`${file}: "panels" must be a non-empty array`);
    }

    const requiredVars = requiredVariablesByUid[dashboard.uid];
    if (requiredVars) {
      const vars = new Set(
        (dashboard.templating?.list ?? [])
          .map((entry) => entry?.name)
          .filter((name): name is string => typeof name === "string")
      );

      for (const variable of requiredVars) {
        if (!vars.has(variable)) {
          errors.push(
            `${file}: dashboard uid "${dashboard.uid}" missing template variable "${variable}"`
          );
        }
      }
    }
  }

  for (const uid of requiredDashboards) {
    if (!availableUids.has(uid)) {
      errors.push(
        `Missing required dashboard uid "${uid}" in ${dashboardsDir}`
      );
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${files.length} dashboard JSON files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

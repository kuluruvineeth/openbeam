"use client";

import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

const DETAIL_TABS = [
  "timeline",
  "agents",
  "tasks",
  "approvals",
  "artifacts",
  "memory",
  "budget",
] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

const SCOPE_VALUES = ["all", "mission", "agent", "task"] as const;

const missionDetailParams = {
  tab: parseAsStringEnum<DetailTab>([...DETAIL_TABS]).withDefault("timeline"),
  agentId: parseAsString,
  taskId: parseAsString,
  artifactId: parseAsString,
  scope: parseAsStringEnum<(typeof SCOPE_VALUES)[number]>([...SCOPE_VALUES]),
  scopeId: parseAsString,
};

function useMissionDetailParams() {
  return useQueryStates(missionDetailParams, {
    history: "push",
    shallow: true,
  });
}

export type { DetailTab };
export { missionDetailParams, useMissionDetailParams };

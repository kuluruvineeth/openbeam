"use client";

import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

const MISSION_STATUSES = [
  "all",
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

type MissionStatusFilter = (typeof MISSION_STATUSES)[number];

const SORT_FIELDS = ["updatedAt", "createdAt", "name", "status"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

const missionFilterParams = {
  status: parseAsStringEnum<MissionStatusFilter>([
    ...MISSION_STATUSES,
  ]).withDefault("all"),
  search: parseAsString.withDefault(""),
  sort: parseAsStringEnum<(typeof SORT_FIELDS)[number]>([
    ...SORT_FIELDS,
  ]).withDefault("updatedAt"),
  order: parseAsStringEnum<(typeof SORT_ORDERS)[number]>([
    ...SORT_ORDERS,
  ]).withDefault("desc"),
};

function useMissionFilterParams() {
  return useQueryStates(missionFilterParams, {
    history: "push",
    shallow: true,
  });
}

export type { MissionStatusFilter };
export { missionFilterParams, useMissionFilterParams };

import type {
  BambooHRSyncBatch,
  BambooHRTransformContext,
} from "@openbeam/types/services/connectors/bamboohr";
import type { GenericDocument } from "@openbeam/vespa";
import type { BambooHRClient } from "../client";
import { transformEmployees } from "../transformers/employee";
import { transformTimeOffRequests } from "../transformers/time-off";
import { createSyncBatch } from "./utils";

const MS_PER_DAY = 86_400_000;

interface FullSyncOptions {
  batchSize?: number;
  syncTerminated?: boolean;
  syncTimeOff?: boolean;
  lookbackDays?: number;
}

export async function* fullSync(
  client: BambooHRClient,
  context: BambooHRTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<BambooHRSyncBatch<GenericDocument>, void, undefined> {
  const {
    syncTerminated = false,
    syncTimeOff = true,
    lookbackDays = 90,
  } = options;

  const directory = await client.getDirectory();
  let employees = directory.employees;

  if (!syncTerminated) {
    employees = employees.filter(
      (emp) => emp.status?.toLowerCase() !== "inactive"
    );
  }

  const documents = await transformEmployees(employees, context);

  yield createSyncBatch(
    documents,
    { lastSyncTime: Date.now() },
    "employees",
    syncTimeOff
  );

  if (syncTimeOff) {
    const now = new Date();
    const start =
      lookbackDays > 0
        ? new Date(now.getTime() - lookbackDays * MS_PER_DAY)
        : new Date("2000-01-01");
    const end = new Date(now.getTime() + 365 * MS_PER_DAY);

    const requests = await client.getTimeOffRequests({
      start: formatDate(start),
      end: formatDate(end),
    });

    const timeOffDocs = await transformTimeOffRequests(requests, context);

    yield createSyncBatch(
      timeOffDocs,
      { lastSyncTime: Date.now() },
      "time_off",
      false
    );
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

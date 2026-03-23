import type {
  BambooHRSyncBatch,
  BambooHRTransformContext,
} from "@openbeam/types/services/connectors/bamboohr";
import type { GenericDocument } from "@openbeam/vespa";
import type { BambooHRClient } from "../client";
import { transformEmployee } from "../transformers/employee";
import { transformTimeOffRequests } from "../transformers/time-off";
import { createSyncBatch } from "./utils";

const MS_PER_DAY = 86_400_000;

interface IncrementalSyncOptions {
  lastSyncTime: number;
  syncTerminated?: boolean;
  syncTimeOff?: boolean;
  lookbackDays?: number;
}

export async function* incrementalSync(
  client: BambooHRClient,
  context: BambooHRTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<BambooHRSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    syncTerminated = false,
    syncTimeOff = true,
    lookbackDays = 90,
  } = options;

  const sinceDate = new Date(lastSyncTime).toISOString();
  const changed = await client.getChangedEmployees(sinceDate);

  const changedIds = Object.keys(changed.employees);
  const documents: GenericDocument[] = [];

  for (const id of changedIds) {
    const entry = changed.employees[id];
    if (!entry) {
      continue;
    }

    if (entry.action === "Deleted") {
      documents.push({
        id: `${context.connectorId}_employee_${id}`,
        connector_id: context.connectorId,
        connector_type: context.connectorType,
        team_id: context.teamId,
        workspace_id: context.workspaceId,
        external_id: id,
        document_type: "employee",
        title: "",
        content: "",
        created_at: 0,
        updated_at: Date.now(),
        is_public: false,
        metadata: { deleted: true, deletedAt: Date.now() },
      });
      continue;
    }

    const employee = await client.getEmployee(id);
    if (!syncTerminated && employee.status?.toLowerCase() === "inactive") {
      continue;
    }

    documents.push(await transformEmployee(employee, context));
  }

  yield createSyncBatch(
    documents,
    { lastSyncTime: Date.now() },
    "employees",
    syncTimeOff
  );

  if (syncTimeOff) {
    const now = new Date();
    const syncSince = new Date(lastSyncTime);
    const start =
      lookbackDays > 0
        ? new Date(
            Math.max(
              syncSince.getTime(),
              now.getTime() - lookbackDays * MS_PER_DAY
            )
          )
        : syncSince;
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

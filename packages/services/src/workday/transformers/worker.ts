import type { WorkdayTransformContext } from "@openbeam/types/services/connectors/workday";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { WorkdayWorker } from "../client";

function buildWorkerContent(worker: WorkdayWorker): string {
  const parts: string[] = [];

  const name =
    worker.descriptor ||
    [worker.firstName, worker.lastName].filter(Boolean).join(" ");
  if (name) {
    parts.push(`Name: ${name}`);
  }
  if (worker.businessTitle) {
    parts.push(`Title: ${worker.businessTitle}`);
  }
  if (worker.supervisoryOrganization?.descriptor) {
    parts.push(`Department: ${worker.supervisoryOrganization.descriptor}`);
  }
  if (worker.location?.descriptor) {
    parts.push(`Location: ${worker.location.descriptor}`);
  }
  if (worker.primaryWorkEmail) {
    parts.push(`Email: ${worker.primaryWorkEmail}`);
  }
  if (worker.primaryWorkPhone) {
    parts.push(`Phone: ${worker.primaryWorkPhone}`);
  }
  if (worker.hireDate) {
    parts.push(`Hire Date: ${worker.hireDate}`);
  }
  if (worker.workerType) {
    parts.push(`Worker Type: ${worker.workerType}`);
  }
  if (worker.employeeId) {
    parts.push(`Employee ID: ${worker.employeeId}`);
  }
  if (worker.isActive !== undefined) {
    parts.push(`Status: ${worker.isActive ? "Active" : "Inactive"}`);
  }

  return parts.join("\n");
}

function buildWorkerMetadata(
  worker: WorkdayWorker,
  ctx: WorkdayTransformContext
): GenericDocument["metadata"] {
  return {
    workerId: worker.id,
    employeeId: worker.employeeId || "",
    businessTitle: worker.businessTitle || "",
    department: worker.supervisoryOrganization?.descriptor || "",
    departmentId: worker.supervisoryOrganization?.id || "",
    location: worker.location?.descriptor || "",
    locationId: worker.location?.id || "",
    workerType: worker.workerType || "",
    isActive: String(worker.isActive ?? true),
    hireDate: worker.hireDate || "",
    tenant: ctx.tenant,
  };
}

export async function transformWorker(
  worker: WorkdayWorker,
  ctx: WorkdayTransformContext
): Promise<GenericDocument> {
  const title =
    worker.descriptor ||
    [worker.firstName, worker.lastName].filter(Boolean).join(" ") ||
    "Unknown Worker";
  const content = buildWorkerContent(worker);
  const metadata = buildWorkerMetadata(worker, ctx);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const email = worker.primaryWorkEmail || "";
  const profileUrl = `https://${encodeURIComponent(ctx.host)}/ccx/api/v1/${encodeURIComponent(ctx.tenant)}/workers/${encodeURIComponent(worker.id)}`;
  const hireTimestamp = worker.hireDate
    ? new Date(worker.hireDate).getTime()
    : Date.now();

  return {
    id: `${ctx.connectorId}_worker_${worker.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: worker.id,
    document_type: "worker",
    document_subtype: worker.isActive === false ? "inactive" : "active",
    title,
    content,
    created_at: hireTimestamp,
    updated_at: Date.now(),
    source_type: "workday",
    url: profileUrl,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    author_id: worker.id,
    author_email: email,
    author_name: title,
    metadata,
    checksum,
  };
}

export function transformWorkers(
  workers: WorkdayWorker[],
  ctx: WorkdayTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(workers.map((w) => transformWorker(w, ctx)));
}

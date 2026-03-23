import type { BambooHRTransformContext } from "@openbeam/types/services/connectors/bamboohr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BambooHRTimeOffRequest } from "../client";

function buildTimeOffContent(req: BambooHRTimeOffRequest): string {
  const parts: string[] = [];

  if (req.name) {
    parts.push(`Employee: ${req.name}`);
  }
  if (req.type?.name) {
    parts.push(`Type: ${req.type.name}`);
  }
  if (req.start) {
    parts.push(`Start: ${req.start}`);
  }
  if (req.end) {
    parts.push(`End: ${req.end}`);
  }
  if (req.status?.status) {
    parts.push(`Status: ${req.status.status}`);
  }
  if (req.amount?.amount && req.amount?.unit) {
    parts.push(`Amount: ${req.amount.amount} ${req.amount.unit}`);
  }
  if (req.notes?.employee) {
    parts.push(`Employee Note: ${req.notes.employee}`);
  }
  if (req.notes?.manager) {
    parts.push(`Manager Note: ${req.notes.manager}`);
  }

  return parts.join("\n");
}

function buildTimeOffMetadata(
  req: BambooHRTimeOffRequest
): GenericDocument["metadata"] {
  return {
    requestId: req.id,
    employeeId: req.employeeId,
    employeeName: req.name || "",
    typeName: req.type?.name || "",
    status: req.status?.status || "",
    startDate: req.start || "",
    endDate: req.end || "",
    amount: req.amount?.amount || "",
    unit: req.amount?.unit || "",
  };
}

export async function transformTimeOffRequest(
  req: BambooHRTimeOffRequest,
  ctx: BambooHRTransformContext
): Promise<GenericDocument> {
  const title = `${req.name} - ${req.type?.name || "Time Off"} (${req.start} to ${req.end})`;
  const content = buildTimeOffContent(req);
  const metadata = buildTimeOffMetadata(req);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = req.created ? new Date(req.created).getTime() : Date.now();
  const updatedAt = req.status?.lastChanged
    ? new Date(req.status.lastChanged).getTime()
    : createdAt;

  return {
    id: `${ctx.connectorId}_timeoff_${req.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: req.id,
    document_type: "time_off_request",
    document_subtype: req.type?.name?.toLowerCase() || "general",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "bamboohr",
    url: `https://${encodeURIComponent(ctx.subdomain)}.bamboohr.com/time_off/requests/?id=${req.id}`,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    author_id: req.employeeId,
    author_name: req.name || "",
    metadata,
    checksum,
  };
}

export function transformTimeOffRequests(
  requests: BambooHRTimeOffRequest[],
  ctx: BambooHRTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(requests.map((req) => transformTimeOffRequest(req, ctx)));
}

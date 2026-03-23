import type { GreenhouseTransformContext } from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { GreenhouseApplication } from "../client";

function buildApplicationContent(app: GreenhouseApplication): string {
  const parts: string[] = [];

  const jobNames = app.jobs.map((j) => j.name).join(", ");
  parts.push(`Application for: ${jobNames || "Unknown Job"}`);
  parts.push(`Status: ${app.status}`);

  if (app.current_stage) {
    parts.push(`Stage: ${app.current_stage.name}`);
  }

  if (app.source) {
    parts.push(`Source: ${app.source.public_name}`);
  }

  if (app.prospect) {
    parts.push("Type: Prospect");
  }

  if (app.rejection_reason) {
    parts.push(`Rejection Reason: ${app.rejection_reason.name}`);
  }

  parts.push(`Applied: ${app.applied_at}`);

  if (app.rejected_at) {
    parts.push(`Rejected: ${app.rejected_at}`);
  }

  return parts.join("\n");
}

export async function transformApplication(
  app: GreenhouseApplication,
  ctx: GreenhouseTransformContext
): Promise<GenericDocument> {
  const jobName = app.jobs[0]?.name ?? "Unknown Job";
  const title = `Application #${app.id} - ${jobName}`;
  const content = buildApplicationContent(app);

  const metadata: GenericDocument["metadata"] = {
    status: app.status,
    candidateId: app.candidate_id,
    prospect: app.prospect,
  };

  if (app.current_stage) {
    metadata.currentStage = app.current_stage.name;
  }

  if (app.source) {
    metadata.source = app.source.public_name;
  }

  if (app.jobs.length > 0) {
    metadata.jobNames = app.jobs.map((j) => j.name).join(", ");
    metadata.jobIds = app.jobs.map((j) => String(j.id)).join(", ");
  }

  if (app.rejection_reason) {
    metadata.rejectionReason = app.rejection_reason.name;
  }

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_application_${app.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: String(app.id),
    document_type: "application",
    document_subtype: app.status,
    title,
    content,
    created_at: new Date(app.created_at).getTime(),
    updated_at: new Date(app.updated_at).getTime(),
    source_type: "greenhouse",
    url: `https://app.greenhouse.io/people/${app.candidate_id}?application_id=${app.id}`,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    metadata,
    checksum,
  };
}

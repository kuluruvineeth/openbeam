import type { GreenhouseTransformContext } from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { GreenhouseJob } from "../client";

function buildJobContent(job: GreenhouseJob): string {
  const parts: string[] = [];
  parts.push(`Job: ${job.name}`);
  parts.push(`Status: ${job.status}`);

  if (job.departments.length > 0) {
    parts.push(`Departments: ${job.departments.map((d) => d.name).join(", ")}`);
  }

  if (job.offices.length > 0) {
    parts.push(`Offices: ${job.offices.map((o) => o.name).join(", ")}`);
  }

  const managers = job.hiring_team?.hiring_managers ?? [];
  if (managers.length > 0) {
    parts.push(`Hiring Managers: ${managers.map((m) => m.name).join(", ")}`);
  }

  const recruiters = job.hiring_team?.recruiters ?? [];
  if (recruiters.length > 0) {
    parts.push(`Recruiters: ${recruiters.map((r) => r.name).join(", ")}`);
  }

  const openCount = job.openings.filter((o) => o.status === "open").length;
  if (openCount > 0) {
    parts.push(`Open Positions: ${openCount}`);
  }

  if (job.notes) {
    parts.push(`Notes: ${job.notes}`);
  }

  return parts.join("\n");
}

export async function transformJob(
  job: GreenhouseJob,
  ctx: GreenhouseTransformContext
): Promise<GenericDocument> {
  const content = buildJobContent(job);
  const managers = job.hiring_team?.hiring_managers ?? [];
  const firstManager = managers[0];

  const metadata: GenericDocument["metadata"] = {
    status: job.status,
    confidential: job.confidential,
    openingsCount: job.openings.length,
    openPositions: job.openings.filter((o) => o.status === "open").length,
  };

  if (job.departments.length > 0) {
    metadata.departments = job.departments.map((d) => d.name).join(", ");
  }

  if (job.offices.length > 0) {
    metadata.offices = job.offices.map((o) => o.name).join(", ");
  }

  if (managers.length > 0) {
    metadata.hiringManagers = managers.map((m) => m.name).join(", ");
  }

  const checksum = await calculateDocumentChecksum({
    title: job.name,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_job_${job.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: String(job.id),
    document_type: "job",
    document_subtype: job.status,
    title: job.name,
    content,
    created_at: new Date(job.created_at).getTime(),
    updated_at: new Date(job.updated_at).getTime(),
    source_type: "greenhouse",
    url: `https://app.greenhouse.io/sdash/jobs/${job.id}`,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    ...(firstManager && {
      author_name: firstManager.name,
      author_id: String(firstManager.user_id),
    }),
    metadata,
    checksum,
  };
}

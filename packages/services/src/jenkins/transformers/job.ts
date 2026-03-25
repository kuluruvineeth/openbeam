import type { JenkinsTransformContext } from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JenkinsJob } from "../api/jobs";
import { formatBuildResult, formatJobStatus } from "./utils";

function buildJobContent(job: JenkinsJob): string {
  const parts: string[] = [];

  if (job.description) {
    parts.push(job.description);
  }

  parts.push(`Status: ${formatJobStatus(job.color)}`);

  if (job.healthReport && job.healthReport.length > 0) {
    for (const report of job.healthReport) {
      parts.push(`Health: ${report.description} (${report.score}%)`);
    }
  }

  if (job.lastBuild) {
    const result = formatBuildResult(job.lastBuild.result ?? null);
    parts.push(`Last Build: #${job.lastBuild.number} - ${result}`);
  }

  if (job.buildable !== undefined) {
    parts.push(`Buildable: ${job.buildable ? "Yes" : "No"}`);
  }

  return parts.join("\n");
}

function buildJobMetadata(job: JenkinsJob): GenericDocument["metadata"] {
  return {
    jobName: job.fullName ?? job.name,
    color: job.color,
    status: formatJobStatus(job.color),
    ...(job.buildable !== undefined && { buildable: job.buildable }),
    ...(job.healthReport &&
      job.healthReport.length > 0 && {
        healthScore: job.healthReport[0]?.score,
      }),
    ...(job.lastBuild && {
      lastBuildNumber: job.lastBuild.number,
      lastBuildResult: job.lastBuild.result ?? "IN_PROGRESS",
    }),
  };
}

export async function transformJob(
  job: JenkinsJob,
  context: JenkinsTransformContext
): Promise<GenericDocument> {
  const title = job.displayName ?? job.fullName ?? job.name;
  const content = buildJobContent(job);
  const metadata = buildJobMetadata(job);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = job.lastBuild?.timestamp ?? Date.now();

  return {
    id: `${context.connectorId}_job_${encodeURIComponent(job.fullName ?? job.name)}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: job.fullName ?? job.name,
    document_type: "job",
    document_subtype: job.color,
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "jenkins",
    url: job.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

import type { JenkinsTransformContext } from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JenkinsView } from "../api/views";

function buildViewContent(view: JenkinsView): string {
  const parts: string[] = [];

  if (view.description) {
    parts.push(view.description);
  }

  if (view.jobs && view.jobs.length > 0) {
    parts.push(`Jobs (${view.jobs.length}):`);
    for (const job of view.jobs) {
      parts.push(`  - ${job.name}`);
    }
  }

  return parts.join("\n");
}

function buildViewMetadata(view: JenkinsView): GenericDocument["metadata"] {
  return {
    viewName: view.name,
    jobCount: view.jobs?.length ?? 0,
    ...(view.jobs && {
      jobNames: JSON.stringify(view.jobs.map((j) => j.name)),
    }),
  };
}

export async function transformView(
  view: JenkinsView,
  context: JenkinsTransformContext
): Promise<GenericDocument> {
  const title = `View: ${view.name}`;
  const content = buildViewContent(view);
  const metadata = buildViewMetadata(view);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_view_${encodeURIComponent(view.name)}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: view.name,
    document_type: "view",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "jenkins",
    url: view.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

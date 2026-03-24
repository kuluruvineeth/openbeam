import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AhaFeature } from "../api/features";
import { stripHtml } from "./utils";

function buildFeatureContent(feature: AhaFeature): string {
  const parts: string[] = [];

  if (feature.description?.body) {
    parts.push(stripHtml(feature.description.body));
  }

  parts.push(`Status: ${feature.workflow_status.name}`);

  if (feature.assigned_to_user) {
    parts.push(`Assigned to: ${feature.assigned_to_user.name}`);
  }

  if (feature.due_date) {
    parts.push(`Due: ${feature.due_date}`);
  }

  if (feature.release) {
    parts.push(`Release: ${feature.release.name}`);
  }

  if (feature.epic) {
    parts.push(`Epic: ${feature.epic.name}`);
  }

  if (feature.initiative) {
    parts.push(`Initiative: ${feature.initiative.name}`);
  }

  if (feature.tags.length > 0) {
    parts.push(`Tags: ${feature.tags.join(", ")}`);
  }

  return parts.join("\n");
}

export async function transformFeature(
  feature: AhaFeature,
  context: AhaTransformContext
): Promise<GenericDocument> {
  const title = feature.name;
  const content = buildFeatureContent(feature);
  const metadata: GenericDocument["metadata"] = {
    referenceNum: feature.reference_num,
    status: feature.workflow_status.name,
    statusColor: feature.workflow_status.color,
    score: String(feature.score),
    ...(feature.assigned_to_user && {
      assignee: feature.assigned_to_user.name,
    }),
    ...(feature.due_date && { dueDate: feature.due_date }),
    ...(feature.start_date && { startDate: feature.start_date }),
    ...(feature.release && {
      releaseName: feature.release.name,
      releaseRef: feature.release.reference_num,
    }),
    ...(feature.epic && {
      epicName: feature.epic.name,
      epicRef: feature.epic.reference_num,
    }),
    ...(feature.initiative && {
      initiativeName: feature.initiative.name,
    }),
    ...(feature.tags.length > 0 && {
      tags: feature.tags.join(", "),
    }),
    productId: feature.product_id,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_feature_${feature.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: feature.id,
    document_type: "feature",
    document_subtype: feature.workflow_status.name,
    title,
    content,
    created_at: new Date(feature.created_at).getTime(),
    updated_at: new Date(feature.updated_at).getTime(),
    source_type: "aha",
    url: feature.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name:
      feature.assigned_to_user?.name ?? feature.created_by_user?.name,
    author_email: feature.assigned_to_user?.email,
  };
}

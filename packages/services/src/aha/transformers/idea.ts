import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AhaIdea } from "../api/ideas";
import { stripHtml } from "./utils";

function buildIdeaContent(idea: AhaIdea): string {
  const parts: string[] = [];

  if (idea.description?.body) {
    parts.push(stripHtml(idea.description.body));
  }

  parts.push(`Status: ${idea.workflow_status.name}`);

  if (idea.categories.length > 0) {
    parts.push(`Categories: ${idea.categories.map((c) => c.name).join(", ")}`);
  }

  if (idea.num_endorsements > 0) {
    parts.push(`Endorsements: ${idea.num_endorsements}`);
  }

  if (idea.initial_votes > 0) {
    parts.push(`Votes: ${idea.initial_votes}`);
  }

  if (idea.assigned_to_user) {
    parts.push(`Assigned to: ${idea.assigned_to_user.name}`);
  }

  if (idea.created_by_user) {
    parts.push(`Created by: ${idea.created_by_user.name}`);
  }

  return parts.join("\n");
}

export async function transformIdea(
  idea: AhaIdea,
  context: AhaTransformContext
): Promise<GenericDocument> {
  const title = idea.name;
  const content = buildIdeaContent(idea);
  const metadata: GenericDocument["metadata"] = {
    referenceNum: idea.reference_num,
    status: idea.workflow_status.name,
    statusColor: idea.workflow_status.color,
    visibility: idea.visibility,
    endorsements: String(idea.num_endorsements),
    votes: String(idea.initial_votes),
    score: String(idea.score),
    promoted: idea.has_been_promoted,
    ...(idea.categories.length > 0 && {
      categories: idea.categories.map((c) => c.name).join(", "),
    }),
    ...(idea.assigned_to_user && {
      assignee: idea.assigned_to_user.name,
    }),
    ...(idea.created_by_user && {
      creator: idea.created_by_user.name,
    }),
    productId: idea.product_id,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_idea_${idea.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: idea.id,
    document_type: "idea",
    document_subtype: idea.workflow_status.name,
    title,
    content,
    created_at: new Date(idea.created_at).getTime(),
    updated_at: new Date(idea.updated_at).getTime(),
    source_type: "aha",
    url: idea.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: idea.assigned_to_user?.name ?? idea.created_by_user?.name,
    author_email: idea.assigned_to_user?.email,
  };
}

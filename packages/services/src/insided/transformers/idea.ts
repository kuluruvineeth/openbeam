import type { InsidedTransformContext } from "@openbeam/types/services/connectors/insided";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InsidedIdea } from "../api/ideas";
import { stripHtml } from "./utils";

function buildIdeaContent(idea: InsidedIdea): string {
  const parts: string[] = [];

  if (idea.content_html) {
    parts.push(stripHtml(idea.content_html));
  } else if (idea.content) {
    parts.push(idea.content);
  }

  parts.push(`Category: ${idea.category.name}`);
  parts.push(`Author: ${idea.author.name}`);
  parts.push(`Status: ${idea.status}`);

  if (idea.vote_count > 0) {
    parts.push(`Votes: ${idea.vote_count}`);
  }

  if (idea.comment_count > 0) {
    parts.push(`Comments: ${idea.comment_count}`);
  }

  return parts.join("\n");
}

export async function transformIdea(
  idea: InsidedIdea,
  context: InsidedTransformContext
): Promise<GenericDocument> {
  const title = idea.title;
  const content = buildIdeaContent(idea);
  const metadata: GenericDocument["metadata"] = {
    category: idea.category.name,
    categorySlug: idea.category.slug,
    status: idea.status,
    voteCount: String(idea.vote_count),
    commentCount: String(idea.comment_count),
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
    document_subtype: idea.status,
    title,
    content,
    created_at: new Date(idea.created_at).getTime(),
    updated_at: new Date(idea.updated_at).getTime(),
    source_type: "insided",
    url: idea.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: idea.author.name,
  };
}

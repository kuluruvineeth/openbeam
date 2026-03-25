import type { InsidedTransformContext } from "@openbeam/types/services/connectors/insided";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InsidedPost } from "../api/posts";
import { stripHtml } from "./utils";

function buildPostContent(post: InsidedPost): string {
  const parts: string[] = [];

  if (post.content_html) {
    parts.push(stripHtml(post.content_html));
  } else if (post.content) {
    parts.push(post.content);
  }

  parts.push(`Category: ${post.category.name}`);
  parts.push(`Author: ${post.author.name}`);

  if (post.reply_count > 0) {
    parts.push(`Replies: ${post.reply_count}`);
  }

  if (post.reaction_count > 0) {
    parts.push(`Reactions: ${post.reaction_count}`);
  }

  if (post.view_count > 0) {
    parts.push(`Views: ${post.view_count}`);
  }

  return parts.join("\n");
}

export async function transformPost(
  post: InsidedPost,
  context: InsidedTransformContext
): Promise<GenericDocument> {
  const title = post.title;
  const content = buildPostContent(post);
  const metadata: GenericDocument["metadata"] = {
    category: post.category.name,
    categorySlug: post.category.slug,
    status: post.status,
    replyCount: String(post.reply_count),
    reactionCount: String(post.reaction_count),
    viewCount: String(post.view_count),
    isPinned: post.is_pinned,
    isLocked: post.is_locked,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_post_${post.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: post.id,
    document_type: "post",
    document_subtype: post.category.name,
    title,
    content,
    created_at: new Date(post.created_at).getTime(),
    updated_at: new Date(post.updated_at).getTime(),
    source_type: "insided",
    url: post.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: post.author.name,
  };
}

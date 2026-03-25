import type { LumAppsTransformContext } from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LumAppsPost } from "../api/posts";
import { buildLumAppsPostUrl, stripHtml } from "./utils";

function buildPostContent(post: LumAppsPost): string {
  const parts: string[] = [];

  parts.push(stripHtml(post.content));

  if (post.community?.name) {
    parts.push(`Community: ${post.community.name}`);
  }

  if (post.reactions !== undefined && post.reactions > 0) {
    parts.push(`Reactions: ${post.reactions}`);
  }

  if (post.comments !== undefined && post.comments > 0) {
    parts.push(`Comments: ${post.comments}`);
  }

  if (post.attachments?.length) {
    const names = post.attachments
      .map((a) => a.name)
      .filter(Boolean)
      .join(", ");
    if (names) {
      parts.push(`Attachments: ${names}`);
    }
  }

  return parts.join("\n");
}

function buildPostMetadata(post: LumAppsPost): GenericDocument["metadata"] {
  return {
    postId: post.id,
    ...(post.community?.id && { communityId: post.community.id }),
    ...(post.community?.name && { communityName: post.community.name }),
    ...(post.reactions !== undefined && { reactions: post.reactions }),
    ...(post.comments !== undefined && { comments: post.comments }),
    ...(post.attachments?.length && {
      attachmentCount: post.attachments.length,
    }),
  };
}

function derivePostTitle(post: LumAppsPost): string {
  const plainText = stripHtml(post.content);
  const firstLine = plainText.split("\n")[0] ?? "";
  if (firstLine.length <= 100) {
    return firstLine || "Untitled Post";
  }
  return `${firstLine.slice(0, 97)}...`;
}

export async function transformPost(
  post: LumAppsPost,
  context: LumAppsTransformContext
): Promise<GenericDocument> {
  const title = derivePostTitle(post);
  const content = buildPostContent(post);
  const metadata = buildPostMetadata(post);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(post.createdAt).getTime();
  const updatedAt = new Date(post.updatedAt).getTime();

  const communityId = post.community?.id ?? "unknown";
  const url = buildLumAppsPostUrl(communityId, post.id);

  return {
    id: `${context.connectorId}_post_${post.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: post.id,
    document_type: "post",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "lumapps",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: post.author?.fullName,
  };
}

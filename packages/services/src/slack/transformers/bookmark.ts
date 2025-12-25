import type { GenericDocument } from "@openplane/vespa";
import type { UserLookup } from "../api/users";
import type { SlackBookmarkType, TransformContext } from "../types";
import { filterUndefined } from "./utils";

export interface SlackBookmark {
  id: string;
  channelId: string;
  title: string;
  link?: string;
  emoji?: string;
  iconUrl?: string;
  type: SlackBookmarkType;
  entityId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

export interface BookmarkTransformContext extends TransformContext {
  userLookup?: UserLookup;
  channelName?: string;
  channelMembers?: string[];
}

export function transformBookmark(
  bookmark: SlackBookmark,
  context: BookmarkTransformContext
): GenericDocument {
  const {
    connectorId,
    connectorType,
    teamId,
    workspaceId,
    userLookup,
    channelName,
    channelMembers,
  } = context;

  const documentId = `${connectorId}_bookmark_${bookmark.id}`;
  const authorName = bookmark.createdBy
    ? userLookup?.getName(bookmark.createdBy)
    : undefined;
  const authorAvatarUrl = bookmark.createdBy
    ? userLookup?.getAvatar(bookmark.createdBy)
    : undefined;
  const content = buildBookmarkContent(bookmark);

  return {
    id: documentId,
    connector_id: connectorId,
    connector_type: connectorType,
    team_id: teamId,
    workspace_id: workspaceId,
    external_id: bookmark.id,
    document_type: "bookmark",
    document_subtype: bookmark.type,
    title: bookmark.title,
    content,
    author_id: bookmark.createdBy,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    created_at: bookmark.createdAt,
    updated_at: bookmark.updatedAt ?? bookmark.createdAt,
    source_id: bookmark.channelId,
    source_name: channelName,
    source_type: "channel",
    url: bookmark.link ?? buildBookmarkUrl(bookmark.channelId, bookmark.id),
    is_public: true,
    access_control: channelMembers,
    metadata: filterUndefined({
      bookmarkId: bookmark.id,
      channelId: bookmark.channelId,
      bookmarkType: bookmark.type,
      entityId: bookmark.entityId,
      emoji: bookmark.emoji,
      iconUrl: bookmark.iconUrl,
    }),
  };
}

function buildBookmarkContent(bookmark: SlackBookmark): string {
  const parts = [`Bookmark: ${bookmark.title}`];
  if (bookmark.link) {
    parts.push(bookmark.link);
  }
  if (bookmark.type !== "link") {
    parts.push(`Type: ${bookmark.type}`);
  }
  return parts.join(" - ");
}

function buildBookmarkUrl(channelId: string, bookmarkId: string): string {
  return `https://slack.com/archives/${channelId}/bookmark/${bookmarkId}`;
}

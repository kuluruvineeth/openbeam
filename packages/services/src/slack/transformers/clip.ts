import type { TransformContext } from "@openbeam/types/services/connectors/slack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { UserLookup } from "../api/users";
import { filterUndefined } from "./utils";

export interface SlackClip {
  id: string;
  title: string;
  channelId: string;
  userId: string;
  duration: number;
  transcript?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: number;
  viewCount?: number;
}

export interface ClipTransformContext extends TransformContext {
  userLookup?: UserLookup;
  channelName?: string;
  channelMembers?: string[];
}

export async function transformClip(
  clip: SlackClip,
  context: ClipTransformContext
): Promise<GenericDocument> {
  const {
    connectorId,
    connectorType,
    teamId,
    workspaceId,
    userLookup,
    channelName,
    channelMembers,
  } = context;

  const documentId = `${connectorId}_clip_${clip.id}`;
  const authorName = clip.userId ? userLookup?.getName(clip.userId) : undefined;
  const authorAvatarUrl = clip.userId
    ? userLookup?.getAvatar(clip.userId)
    : undefined;
  const content = clip.transcript ?? `Video clip: ${clip.title}`;

  const metadata = filterUndefined({
    clipId: clip.id,
    channelId: clip.channelId,
    duration: clip.duration,
    hasTranscript: !!clip.transcript,
    thumbnailUrl: clip.thumbnailUrl,
  });

  const checksum = await calculateDocumentChecksum({
    title: clip.title,
    content,
    metadata,
  });

  return {
    id: documentId,
    connector_id: connectorId,
    connector_type: connectorType,
    team_id: teamId,
    workspace_id: workspaceId,
    external_id: clip.id,
    document_type: "clip",
    document_subtype: "video",
    title: clip.title,
    content,
    author_id: clip.userId,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    created_at: clip.createdAt,
    updated_at: clip.createdAt,
    source_id: clip.channelId,
    source_name: channelName,
    source_type: "channel",
    url: clip.videoUrl ?? buildClipUrl(teamId, clip.id),
    view_count: clip.viewCount,
    is_public: true,
    access_control: channelMembers,
    metadata,
    checksum,
  };
}

function buildClipUrl(teamId: string, clipId: string): string {
  return `https://app.slack.com/files/${teamId}/${clipId}`;
}

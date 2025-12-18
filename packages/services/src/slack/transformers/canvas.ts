import type { GenericDocument, JsonObject, JsonValue } from "@openplane/vespa";
import type { UserLookup } from "../api/users";
import type { SlackCanvasAccessLevel, TransformContext } from "../types";

function filterUndefined(obj: Record<string, unknown>): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value as JsonValue;
    }
  }
  return result;
}

export interface SlackCanvas {
  id: string;
  title: string;
  channelId?: string;
  documentContent?: string;
  lastModified: number;
  lastModifiedBy?: string;
  isPublished: boolean;
  accessLevel: SlackCanvasAccessLevel;
}

export interface CanvasTransformContext extends TransformContext {
  userLookup?: UserLookup;
  channelName?: string;
  channelMembers?: string[];
}

export function transformCanvas(
  canvas: SlackCanvas,
  context: CanvasTransformContext
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

  const documentId = `${connectorId}_canvas_${canvas.id}`;
  const authorName = canvas.lastModifiedBy
    ? userLookup?.getName(canvas.lastModifiedBy)
    : undefined;
  const isPrivate =
    canvas.accessLevel === "private" || canvas.accessLevel === "channel";

  return {
    id: documentId,
    connector_id: connectorId,
    connector_type: connectorType,
    team_id: teamId,
    workspace_id: workspaceId,
    external_id: canvas.id,
    document_type: "canvas",
    title: canvas.title,
    content: canvas.documentContent ?? "",
    author_id: canvas.lastModifiedBy,
    author_name: authorName,
    created_at: canvas.lastModified,
    updated_at: canvas.lastModified,
    source_id: canvas.channelId,
    source_name: channelName,
    source_type: canvas.channelId ? "channel" : "workspace",
    url: buildCanvasUrl(teamId, canvas.id),
    is_public: !isPrivate,
    access_control: isPrivate ? channelMembers : undefined,
    metadata: filterUndefined({
      canvasId: canvas.id,
      channelId: canvas.channelId,
      isPublished: canvas.isPublished,
      accessLevel: canvas.accessLevel,
    }),
  };
}

function buildCanvasUrl(teamId: string, canvasId: string): string {
  return `https://app.slack.com/docs/${teamId}/${canvasId}`;
}

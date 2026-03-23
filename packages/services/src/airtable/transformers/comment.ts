import type { AirtableTransformContext } from "@openbeam/types/services/connectors/airtable";
import type { GenericDocument } from "@openbeam/vespa";
import type { AirtableComment } from "../api/comments";
import { buildAirtableRecordUrl } from "./utils";

type CommentTransformMeta = {
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
  recordId: string;
};

export function transformAirtableComment(
  comment: AirtableComment,
  context: AirtableTransformContext,
  meta: CommentTransformMeta
): GenericDocument {
  const title =
    comment.text.length > 80
      ? `${comment.text.substring(0, 80)}...`
      : comment.text || "Untitled Comment";

  const createdAt = new Date(comment.createdTime).getTime();
  const updatedAt = comment.lastUpdatedTime
    ? new Date(comment.lastUpdatedTime).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    document_subtype: "record_comment",
    title,
    content: comment.text,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildAirtableRecordUrl(meta.baseId, meta.tableId, meta.recordId),
    author_name: comment.author.name,
    author_email: comment.author.email,
    author_id: comment.author.id,
    is_public: false,
    access_control: [],
    metadata: {
      baseId: meta.baseId,
      baseName: meta.baseName,
      tableId: meta.tableId,
      tableName: meta.tableName,
      recordId: meta.recordId,
    },
  };
}

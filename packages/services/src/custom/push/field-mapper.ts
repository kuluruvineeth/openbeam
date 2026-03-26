import type { PushDocument } from "@openbeam/types/services/connectors/custom";
import type { GenericDocument } from "@openbeam/vespa";

export interface FieldMapperContext {
  connectorId: string;
  teamId: string;
  workspaceId: string;
  defaultDocumentType: string;
  defaultIsPublic: boolean;
  fieldMappings: Record<string, string>;
}

function toUnixTimestamp(value: string | number | undefined): number {
  if (value === undefined) {
    return Math.floor(Date.now() / 1000);
  }
  if (typeof value === "number") {
    return value;
  }
  return Math.floor(new Date(value).getTime() / 1000);
}

function buildMetadata(
  doc: PushDocument,
  fieldMappings: Record<string, string>
): string | undefined {
  const extra: Record<string, unknown> = {};

  if (doc.metadata) {
    for (const [key, value] of Object.entries(doc.metadata)) {
      extra[key] = value;
    }
  }

  const unmappedKeys = Object.keys(fieldMappings).filter(
    (k) => !(k in doc) && k in (doc.metadata ?? {})
  );
  for (const key of unmappedKeys) {
    extra[key] = doc.metadata?.[key];
  }

  return Object.keys(extra).length > 0 ? JSON.stringify(extra) : undefined;
}

export function mapPushDocumentToGeneric(
  doc: PushDocument,
  ctx: FieldMapperContext
): GenericDocument {
  const now = Math.floor(Date.now() / 1000);

  return {
    id: `${ctx.connectorId}_custom_${doc.id}`,
    connector_id: ctx.connectorId,
    connector_type: "CUSTOM",
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: doc.id,
    document_type: doc.document_type ?? ctx.defaultDocumentType,
    title: doc.title,
    content: doc.content,
    url: doc.url,
    author_name: doc.author_name,
    author_email: doc.author_email,
    labels: doc.labels,
    status: doc.status,
    priority: doc.priority,
    parent_id: doc.parent_id
      ? `${ctx.connectorId}_custom_${doc.parent_id}`
      : undefined,
    source_name: doc.source_name,
    source_path: doc.source_path,
    access_control: doc.access_control,
    is_public: doc.is_public ?? ctx.defaultIsPublic,
    created_at: toUnixTimestamp(doc.created_at),
    updated_at: toUnixTimestamp(doc.updated_at),
    indexed_at: now,
    metadata: buildMetadata(doc, ctx.fieldMappings)
      ? JSON.parse(buildMetadata(doc, ctx.fieldMappings) as string)
      : undefined,
  };
}

export function mapBatchToGeneric(
  documents: PushDocument[],
  ctx: FieldMapperContext
): GenericDocument[] {
  return documents.map((doc) => mapPushDocumentToGeneric(doc, ctx));
}

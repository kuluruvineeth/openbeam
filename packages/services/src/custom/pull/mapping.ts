import type {
  CustomPullTransformContext,
  EndpointDefinition,
  FieldMappingEntry,
} from "@openbeam/types/services/connectors/custom-pull";
import type { GenericDocument } from "@openbeam/vespa";
import { applyContentTemplate, resolveJsonPath } from "./jsonpath";
import { FieldMappingError } from "./types";

const HTML_TAG_PATTERN = /<[^>]+>/g;

function coerceValue(
  raw: unknown,
  transform: FieldMappingEntry["transform"]
): unknown {
  if (raw === null || raw === undefined) {
    return raw;
  }

  switch (transform) {
    case "string":
      return String(raw);
    case "number": {
      const num = Number(raw);
      return Number.isNaN(num) ? undefined : num;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "1" || raw === 1;
    case "timestamp": {
      if (typeof raw === "number") {
        return raw > 1e12 ? Math.floor(raw / 1000) : raw;
      }
      if (typeof raw === "string") {
        const ms = new Date(raw).getTime();
        return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
      }
      return;
    }
    case "strip_html":
      return typeof raw === "string"
        ? raw.replace(HTML_TAG_PATTERN, " ").replace(/\s+/g, " ").trim()
        : String(raw);
    case "join":
      return Array.isArray(raw) ? raw.join(", ") : String(raw);
    default:
      return raw;
  }
}

function extractMappedFields(
  item: Record<string, unknown>,
  mappings: FieldMappingEntry[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const raw = resolveJsonPath(item, mapping.sourcePath);
    const value =
      raw !== null && raw !== undefined
        ? coerceValue(raw, mapping.transform)
        : mapping.defaultValue;

    if (value !== null && value !== undefined) {
      result[mapping.targetField] = value;
    }
  }

  return result;
}

function assembleContent(
  item: Record<string, unknown>,
  endpoint: EndpointDefinition
): string {
  if (endpoint.contentTemplate) {
    return applyContentTemplate(endpoint.contentTemplate, item);
  }

  if (endpoint.contentFields?.length) {
    const parts: string[] = [];
    for (const fieldPath of endpoint.contentFields) {
      const val = resolveJsonPath(item, fieldPath);
      if (val !== null && val !== undefined) {
        const text = typeof val === "string" ? val : JSON.stringify(val);
        parts.push(text);
      }
    }
    return parts.join("\n\n");
  }

  return "";
}

function resolveUrl(
  item: Record<string, unknown>,
  endpoint: EndpointDefinition
): string | undefined {
  if (endpoint.urlTemplate) {
    return applyContentTemplate(endpoint.urlTemplate, item);
  }
  return;
}

function toUnixTimestamp(value: unknown): number {
  if (typeof value === "number") {
    return value > 1e12 ? Math.floor(value / 1000) : value;
  }
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      return Math.floor(ms / 1000);
    }
  }
  return Math.floor(Date.now() / 1000);
}

export function mapItemToDocument(
  item: Record<string, unknown>,
  endpoint: EndpointDefinition,
  ctx: CustomPullTransformContext
): GenericDocument {
  const mapped = extractMappedFields(item, endpoint.fieldMappings);

  const externalId = mapped.external_id ?? mapped.id;
  if (!externalId) {
    throw new FieldMappingError({
      message: "No external_id or id field mapped for document",
      sourcePath: "external_id",
      targetField: "external_id",
    });
  }

  const externalIdStr = String(externalId);
  const documentId = `${ctx.connectorId}_${endpoint.documentType}_${externalIdStr}`;
  const title =
    (mapped.title as string) ?? `${endpoint.documentType} ${externalIdStr}`;
  const assembled = assembleContent(item, endpoint);
  const content = assembled || ((mapped.content as string | undefined) ?? "");
  const url = resolveUrl(item, endpoint) ?? (mapped.url as string | undefined);
  const now = Math.floor(Date.now() / 1000);

  return {
    id: documentId,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: externalIdStr,
    document_type: endpoint.documentType,
    document_subtype: endpoint.documentSubtype,
    title,
    content,
    url,
    author_name: mapped.author_name as string | undefined,
    author_email: mapped.author_email as string | undefined,
    labels: mapped.labels as string[] | undefined,
    status: mapped.status as string | undefined,
    priority: mapped.priority as string | undefined,
    source_name: (mapped.source_name as string) ?? ctx.slug,
    created_at: toUnixTimestamp(mapped.created_at ?? now),
    updated_at: toUnixTimestamp(mapped.updated_at ?? now),
    indexed_at: now,
    is_public: (mapped.is_public as boolean) ?? false,
  };
}

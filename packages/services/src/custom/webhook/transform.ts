import type {
  EventMapping,
  TransformContext,
  TransformResult,
  WebhookConfig,
} from "@openbeam/types/services/connectors/custom-webhook";
import type { GenericDocument } from "@openbeam/vespa";

const BRACKET_PATTERN = /^(\w+)\[(\d+)]$/;

export function resolveJsonPath(
  payload: Record<string, unknown>,
  path: string
): unknown {
  const normalized = path.startsWith("$.") ? path.slice(2) : path;
  const segments = normalized.split(".");
  let current: unknown = payload;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return;
    }

    const bracketMatch = segment.match(BRACKET_PATTERN);
    if (bracketMatch?.[1] && bracketMatch[2]) {
      const field = bracketMatch[1];
      const indexStr = bracketMatch[2];
      const obj = (current as Record<string, unknown>)[field];
      if (!Array.isArray(obj)) {
        return;
      }
      current = obj[Number(indexStr)];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }

  return current;
}

export function applyContentTemplate(
  template: string,
  payload: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)}}/g, (_, path: string) => {
    const value = resolveJsonPath(payload, path.trim());
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });
}

export function extractEventType(
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  config: WebhookConfig
): string | undefined {
  if (config.eventTypeHeader) {
    const headerValue = headers[config.eventTypeHeader.toLowerCase()];
    if (headerValue) {
      return headerValue;
    }
  }

  if (config.eventTypeField) {
    const value = resolveJsonPath(payload, config.eventTypeField);
    if (typeof value === "string") {
      return value;
    }
    if (value !== null && value !== undefined) {
      return String(value);
    }
  }

  return;
}

function resolveMapping(
  eventType: string | undefined,
  config: WebhookConfig
): EventMapping | undefined {
  if (eventType && config.eventMappings?.[eventType]) {
    return config.eventMappings[eventType];
  }
  return config.defaultMapping;
}

function applyFieldMapping(
  payload: Record<string, unknown>,
  fieldMapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [jsonPath, docField] of Object.entries(fieldMapping)) {
    const value = resolveJsonPath(payload, jsonPath);
    if (value !== undefined) {
      result[docField] = value;
    }
  }
  return result;
}

function toUnixTimestamp(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }
  return Math.floor(Date.now() / 1000);
}

export function transformWebhookPayload(
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  config: WebhookConfig,
  ctx: TransformContext
): TransformResult {
  const eventType = extractEventType(headers, payload, config);

  if (
    config.eventFilter &&
    config.eventFilter.length > 0 &&
    !(eventType && config.eventFilter.includes(eventType))
  ) {
    return { success: true, action: "ignore" };
  }

  const mapping = resolveMapping(eventType, config);
  if (!mapping) {
    return { success: true, action: "ignore" };
  }

  const externalId = resolveJsonPath(payload, mapping.idPath);
  if (externalId === null || externalId === undefined) {
    return {
      success: false,
      action: "error",
      error: `Cannot extract document ID from path: ${mapping.idPath}`,
    };
  }

  const externalIdStr = String(externalId);
  const documentId = `${ctx.connectorId}_${mapping.documentType}_${externalIdStr}`;

  if (mapping.action === "delete") {
    return { success: true, action: "delete", documentId };
  }

  const mapped = applyFieldMapping(payload, mapping.fieldMapping);
  const staticFields = mapping.staticFields ?? {};

  const now = Math.floor(Date.now() / 1000);

  const title =
    (mapped.title as string) ??
    (staticFields.title as string) ??
    `${mapping.documentType} ${externalIdStr}`;

  let content =
    (mapped.content as string) ?? (staticFields.content as string) ?? "";

  if (config.contentTemplate) {
    content = applyContentTemplate(config.contentTemplate, payload);
  }

  const url = config.urlTemplate
    ? applyContentTemplate(config.urlTemplate, payload)
    : (mapped.url as string | undefined);

  const document: GenericDocument = {
    id: documentId,
    connector_id: ctx.connectorId,
    connector_type: "CUSTOM",
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: externalIdStr,
    document_type: mapping.documentType,
    document_subtype: mapping.documentSubtype,
    title,
    content,
    url,
    author_name: mapped.author_name as string | undefined,
    author_email: mapped.author_email as string | undefined,
    labels: mapped.labels as string[] | undefined,
    status:
      (mapped.status as string) ?? (staticFields.status as string | undefined),
    priority: mapped.priority as string | undefined,
    source_name: (mapped.source_name as string) ?? ctx.slug,
    created_at: toUnixTimestamp(mapped.created_at),
    updated_at: toUnixTimestamp(mapped.updated_at),
    indexed_at: now,
    is_public: (mapped.is_public as boolean) ?? false,
  };

  return {
    success: true,
    action: "upsert",
    documentId,
    document: document as unknown as Record<string, unknown>,
  };
}

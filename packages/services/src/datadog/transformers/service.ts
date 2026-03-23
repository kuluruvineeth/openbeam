import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogServiceDefinition } from "../api/services";
import { buildDatadogUrl } from "./utils";

function buildServiceContent(svc: DatadogServiceDefinition): string {
  const schema = svc.attributes.schema;
  const parts: string[] = [];

  if (schema.description) {
    parts.push(schema.description);
  }

  if (schema.team) {
    parts.push(`Team: ${schema.team}`);
  }

  if (schema.application) {
    parts.push(`Application: ${schema.application}`);
  }

  if (schema.tier) {
    parts.push(`Tier: ${schema.tier}`);
  }

  if (schema.lifecycle) {
    parts.push(`Lifecycle: ${schema.lifecycle}`);
  }

  if (schema.tags && schema.tags.length > 0) {
    parts.push(`Tags: ${schema.tags.join(", ")}`);
  }

  if (schema.contacts && schema.contacts.length > 0) {
    const contacts = schema.contacts
      .map((c) => `${c.type}: ${c.contact}${c.name ? ` (${c.name})` : ""}`)
      .join(", ");
    parts.push(`Contacts: ${contacts}`);
  }

  if (schema.links && schema.links.length > 0) {
    const links = schema.links.map((l) => `${l.name}: ${l.url}`).join(", ");
    parts.push(`Links: ${links}`);
  }

  return parts.join("\n");
}

function buildServiceMetadata(
  svc: DatadogServiceDefinition
): GenericDocument["metadata"] {
  const schema = svc.attributes.schema;
  return {
    serviceName: schema["dd-service"],
    ...(schema.team && { team: schema.team }),
    ...(schema.application && { application: schema.application }),
    ...(schema.tier && { tier: schema.tier }),
    ...(schema.lifecycle && { lifecycle: schema.lifecycle }),
    schemaVersion: schema["schema-version"],
    ...(schema.tags &&
      schema.tags.length > 0 && { tags: schema.tags.join(", ") }),
  };
}

export async function transformService(
  svc: DatadogServiceDefinition,
  context: DatadogTransformContext
): Promise<GenericDocument> {
  const serviceName = svc.attributes.schema["dd-service"];
  const title = serviceName;
  const content = buildServiceContent(svc);
  const metadata = buildServiceMetadata(svc);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const lastModified = svc.attributes.meta["last-modified-time"];
  const updatedAt = lastModified
    ? new Date(lastModified).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_service_${svc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: svc.id,
    document_type: "service",
    document_subtype: svc.attributes.schema.tier ?? "default",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(
      context.site,
      `/services/catalog/${encodeURIComponent(serviceName)}`
    ),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: svc.attributes.schema.team,
  };
}

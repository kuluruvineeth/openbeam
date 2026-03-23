import type { OpsGenieTransformContext } from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { OpsGenieService } from "../api/services";

function buildServiceContent(service: OpsGenieService): string {
  const parts: string[] = [];

  if (service.description) {
    parts.push(service.description);
  }

  if (service.teamName) {
    parts.push(`Team: ${service.teamName}`);
  }

  if (service.tags?.length) {
    parts.push(`Tags: ${service.tags.join(", ")}`);
  }

  if (service.isExternal) {
    parts.push("External service");
  }

  return parts.join("\n");
}

function buildServiceMetadata(
  service: OpsGenieService
): GenericDocument["metadata"] {
  return {
    serviceId: service.id,
    ...(service.teamId && { teamId: service.teamId }),
    ...(service.teamName && { teamName: service.teamName }),
    ...(service.tags?.length && { tags: service.tags.join(", ") }),
    ...(service.isExternal != null && {
      isExternal: service.isExternal,
    }),
  };
}

export async function transformService(
  service: OpsGenieService,
  context: OpsGenieTransformContext
): Promise<GenericDocument> {
  const title = service.name;
  const content = buildServiceContent(service);
  const metadata = buildServiceMetadata(service);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_service_${service.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: service.id,
    document_type: "service",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "opsgenie",
    url: `https://app.opsgenie.com/service/${service.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

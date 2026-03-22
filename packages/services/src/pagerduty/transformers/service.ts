import type { PagerDutyTransformContext } from "@openbeam/types/services/connectors/pagerduty";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PagerDutyService {
  id: string;
  name: string;
  description?: string;
  status: string;
  html_url: string;
  created_at: string;
  updated_at?: string;
  escalation_policy?: {
    id: string;
    summary: string;
    html_url?: string;
  };
  teams?: {
    id: string;
    summary: string;
  }[];
  integrations?: {
    id: string;
    summary: string;
    type: string;
  }[];
  alert_creation?: string;
  auto_resolve_timeout?: number | null;
  acknowledgement_timeout?: number | null;
}

function buildServiceContent(service: PagerDutyService): string {
  const parts: string[] = [];

  if (service.description) {
    parts.push(service.description);
  }

  parts.push(`Status: ${service.status}`);

  if (service.escalation_policy) {
    parts.push(`Escalation Policy: ${service.escalation_policy.summary}`);
  }

  if (service.teams?.length) {
    parts.push(`Teams: ${service.teams.map((t) => t.summary).join(", ")}`);
  }

  if (service.integrations?.length) {
    parts.push(
      `Integrations: ${service.integrations.map((i) => i.summary).join(", ")}`
    );
  }

  if (service.alert_creation) {
    parts.push(`Alert Creation: ${service.alert_creation}`);
  }

  return parts.join("\n");
}

function buildServiceMetadata(
  service: PagerDutyService
): GenericDocument["metadata"] {
  return {
    serviceId: service.id,
    status: service.status,
    ...(service.escalation_policy && {
      escalationPolicyId: service.escalation_policy.id,
      escalationPolicy: service.escalation_policy.summary,
    }),
    ...(service.teams?.length && {
      teams: service.teams.map((t) => t.summary).join(", "),
    }),
    ...(service.alert_creation && {
      alertCreation: service.alert_creation,
    }),
    ...(service.auto_resolve_timeout != null && {
      autoResolveTimeout: service.auto_resolve_timeout,
    }),
    ...(service.acknowledgement_timeout != null && {
      acknowledgementTimeout: service.acknowledgement_timeout,
    }),
  };
}

export async function transformService(
  service: PagerDutyService,
  context: PagerDutyTransformContext
): Promise<GenericDocument> {
  const title = service.name;
  const content = buildServiceContent(service);
  const metadata = buildServiceMetadata(service);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(service.created_at).getTime();
  const updatedAt = service.updated_at
    ? new Date(service.updated_at).getTime()
    : createdAt;

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
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "pagerduty",
    source_name: context.subdomain,
    url: service.html_url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

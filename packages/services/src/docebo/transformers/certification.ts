import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import type { DoceboCertification } from "../api/certifications";
import { buildDoceboUrl } from "./utils";

export function transformDoceboCertification(
  cert: DoceboCertification,
  context: DoceboTransformContext
): GenericDocument {
  const parts = [
    cert.description || null,
    cert.code ? `Code: ${cert.code}` : null,
    cert.status ? `Status: ${cert.status}` : null,
    cert.duration ? `Duration: ${cert.duration} minutes` : null,
    cert.expiration_days !== null
      ? `Expires after: ${cert.expiration_days} days`
      : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_certification_${cert.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(cert.id),
    document_type: "certification",
    document_subtype: cert.status,
    title: cert.title,
    content: parts.join(" — "),
    created_at: new Date(cert.date_creation).getTime(),
    updated_at: new Date(cert.date_last_updated).getTime(),
    url: buildDoceboUrl(context.instanceUrl, "certification", cert.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(cert.code && { certCode: cert.code }),
      ...(cert.status && { status: cert.status }),
      ...(cert.duration && { duration: String(cert.duration) }),
      ...(cert.expiration_days !== null && {
        expirationDays: String(cert.expiration_days),
      }),
    },
  };
}

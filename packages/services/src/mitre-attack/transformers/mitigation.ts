import type {
  MitreAttackTransformContext,
  StixCourseOfAction,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { getAttackUrl, getExternalId } from "../api/stix";

export async function transformMitigation(
  mitigation: StixCourseOfAction,
  ctx: MitreAttackTransformContext
): Promise<GenericDocument> {
  const attackId = getExternalId(mitigation) ?? mitigation.id;
  const title = `${attackId}: ${mitigation.name ?? "Unknown Mitigation"}`;
  const content = mitigation.description ?? "";

  const metadata = {
    attackId,
    domain: ctx.domain,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_mitigation_${mitigation.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: mitigation.id,
    document_type: "mitigation",
    title,
    content,
    created_at: new Date(mitigation.created).getTime(),
    updated_at: new Date(mitigation.modified).getTime(),
    source_type: "mitre-attack",
    source_name: "MITRE ATT&CK",
    url: getAttackUrl(mitigation),
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}

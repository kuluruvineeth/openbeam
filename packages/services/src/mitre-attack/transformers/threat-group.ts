import type {
  MitreAttackTransformContext,
  StixIntrusionSet,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { getAttackUrl, getExternalId } from "../api/stix";

function buildThreatGroupContent(group: StixIntrusionSet): string {
  const parts: string[] = [];

  if (group.description) {
    parts.push(group.description);
  }

  if (group.aliases?.length) {
    parts.push(`Aliases: ${group.aliases.join(", ")}`);
  }

  return parts.join("\n\n");
}

export async function transformThreatGroup(
  group: StixIntrusionSet,
  ctx: MitreAttackTransformContext
): Promise<GenericDocument> {
  const attackId = getExternalId(group) ?? group.id;
  const title = `${attackId}: ${group.name ?? "Unknown Group"}`;
  const content = buildThreatGroupContent(group);

  const metadata = {
    attackId,
    domain: ctx.domain,
    aliases: JSON.stringify(group.aliases ?? []),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_threat_group_${group.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: group.id,
    document_type: "threat_group",
    title,
    content,
    created_at: new Date(group.created).getTime(),
    updated_at: new Date(group.modified).getTime(),
    source_type: "mitre-attack",
    source_name: "MITRE ATT&CK",
    url: getAttackUrl(group),
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}

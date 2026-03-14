import type {
  MitreAttackTransformContext,
  StixMalware,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { getAttackUrl, getExternalId } from "../api/stix";

function buildSoftwareContent(software: StixMalware): string {
  const parts: string[] = [];

  if (software.description) {
    parts.push(software.description);
  }

  if (software.x_mitre_platforms?.length) {
    parts.push(`Platforms: ${software.x_mitre_platforms.join(", ")}`);
  }

  if (software.x_mitre_aliases?.length) {
    parts.push(`Aliases: ${software.x_mitre_aliases.join(", ")}`);
  }

  return parts.join("\n\n");
}

export async function transformSoftware(
  software: StixMalware,
  ctx: MitreAttackTransformContext
): Promise<GenericDocument> {
  const attackId = getExternalId(software) ?? software.id;
  const title = `${attackId}: ${software.name ?? "Unknown Software"}`;
  const content = buildSoftwareContent(software);

  const metadata = {
    attackId,
    domain: ctx.domain,
    softwareType: software.type,
    platforms: JSON.stringify(software.x_mitre_platforms ?? []),
    aliases: JSON.stringify(software.x_mitre_aliases ?? []),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_malware_${software.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: software.id,
    document_type: "malware",
    title,
    content,
    created_at: new Date(software.created).getTime(),
    updated_at: new Date(software.modified).getTime(),
    source_type: "mitre-attack",
    source_name: "MITRE ATT&CK",
    url: getAttackUrl(software),
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}

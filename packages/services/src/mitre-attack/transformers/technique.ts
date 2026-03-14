import type {
  MitreAttackTransformContext,
  StixAttackPattern,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { getAttackUrl, getExternalId } from "../api/stix";

function buildTechniqueContent(technique: StixAttackPattern): string {
  const parts: string[] = [];

  if (technique.description) {
    parts.push(technique.description);
  }

  if (technique.x_mitre_detection) {
    parts.push(`Detection: ${technique.x_mitre_detection}`);
  }

  if (technique.x_mitre_data_sources?.length) {
    parts.push(`Data Sources: ${technique.x_mitre_data_sources.join(", ")}`);
  }

  if (technique.x_mitre_platforms?.length) {
    parts.push(`Platforms: ${technique.x_mitre_platforms.join(", ")}`);
  }

  return parts.join("\n\n");
}

function extractTactics(technique: StixAttackPattern): string[] {
  return (
    technique.kill_chain_phases
      ?.filter((phase) => phase.kill_chain_name === "mitre-attack")
      .map((phase) => phase.phase_name) ?? []
  );
}

export async function transformTechnique(
  technique: StixAttackPattern,
  ctx: MitreAttackTransformContext
): Promise<GenericDocument> {
  const attackId = getExternalId(technique) ?? technique.id;
  const title = `${attackId}: ${technique.name ?? "Unknown Technique"}`;
  const content = buildTechniqueContent(technique);
  const tactics = extractTactics(technique);

  const metadata = {
    attackId,
    domain: ctx.domain,
    isSubtechnique: technique.x_mitre_is_subtechnique ?? false,
    platforms: JSON.stringify(technique.x_mitre_platforms ?? []),
    tactics: JSON.stringify(tactics),
    dataSources: JSON.stringify(technique.x_mitre_data_sources ?? []),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_technique_${technique.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: technique.id,
    document_type: "technique",
    title,
    content,
    created_at: new Date(technique.created).getTime(),
    updated_at: new Date(technique.modified).getTime(),
    source_type: "mitre-attack",
    source_name: "MITRE ATT&CK",
    url: getAttackUrl(technique),
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}

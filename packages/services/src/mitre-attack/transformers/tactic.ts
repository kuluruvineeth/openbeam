import type {
  MitreAttackTransformContext,
  StixTactic,
} from "@openbeam/types/services/connectors/mitre-attack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { getAttackUrl, getExternalId } from "../api/stix";

export async function transformTactic(
  tactic: StixTactic,
  ctx: MitreAttackTransformContext
): Promise<GenericDocument> {
  const attackId = getExternalId(tactic) ?? tactic.id;
  const title = `${attackId}: ${tactic.name ?? "Unknown Tactic"}`;
  const content = tactic.description ?? "";

  const metadata = {
    attackId,
    domain: ctx.domain,
    shortname: tactic.x_mitre_shortname ?? "",
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_tactic_${tactic.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: tactic.id,
    document_type: "tactic",
    title,
    content,
    created_at: new Date(tactic.created).getTime(),
    updated_at: new Date(tactic.modified).getTime(),
    source_type: "mitre-attack",
    source_name: "MITRE ATT&CK",
    url: getAttackUrl(tactic),
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}

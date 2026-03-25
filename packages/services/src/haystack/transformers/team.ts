import type { HaystackTransformContext } from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { HaystackTeam } from "../api/teams";

function buildTeamContent(team: HaystackTeam): string {
  const parts: string[] = [];

  parts.push(team.name);

  if (team.description) {
    parts.push(team.description);
  }

  if (team.lead) {
    parts.push(`Lead: ${team.lead.first_name} ${team.lead.last_name}`);
  }

  parts.push(`Members: ${team.member_count}`);

  if (team.members && team.members.length > 0) {
    const memberNames = team.members
      .map((m) => `${m.first_name} ${m.last_name}`)
      .join(", ");
    parts.push(`Team Members: ${memberNames}`);
  }

  return parts.join("\n");
}

export async function transformTeam(
  team: HaystackTeam,
  context: HaystackTransformContext
): Promise<GenericDocument> {
  const title = team.name;
  const content = buildTeamContent(team);
  const metadata: GenericDocument["metadata"] = {
    memberCount: String(team.member_count),
    ...(team.lead && {
      lead: `${team.lead.first_name} ${team.lead.last_name}`,
    }),
    ...(team.description && { description: team.description }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_team_${team.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: team.id,
    document_type: "team",
    title,
    content,
    created_at: new Date(team.created_at).getTime(),
    updated_at: new Date(team.updated_at).getTime(),
    source_type: "haystack",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: team.lead
      ? `${team.lead.first_name} ${team.lead.last_name}`
      : undefined,
    author_email: team.lead?.email,
  };
}

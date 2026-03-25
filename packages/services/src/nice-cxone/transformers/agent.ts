import type { NiceCxoneTransformContext } from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import type { CxoneAgent } from "../api/agents";
import { buildCxoneUrl } from "./utils";

export function transformCxoneAgent(
  agent: CxoneAgent,
  context: NiceCxoneTransformContext
): GenericDocument {
  const fullName = [agent.firstName, agent.middleName, agent.lastName]
    .filter(Boolean)
    .join(" ");

  const skillNames = (agent.skills ?? [])
    .map((s) => s.skillName)
    .filter(Boolean)
    .join(", ");

  const parts = [
    agent.emailAddress ? `Email: ${agent.emailAddress}` : null,
    agent.teamName ? `Team: ${agent.teamName}` : null,
    agent.profileName ? `Profile: ${agent.profileName}` : null,
    agent.isActive ? "Status: Active" : "Status: Inactive",
    skillNames ? `Skills: ${skillNames}` : null,
    agent.lastLogin ? `Last login: ${agent.lastLogin}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_agent_${agent.agentId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(agent.agentId),
    document_type: "agent",
    document_subtype: agent.isActive ? "active" : "inactive",
    title: fullName || agent.userName || `Agent #${agent.agentId}`,
    content: parts.join(" — "),
    created_at: agent.lastUpdated
      ? new Date(agent.lastUpdated).getTime()
      : Date.now(),
    updated_at: agent.lastUpdated
      ? new Date(agent.lastUpdated).getTime()
      : Date.now(),
    url: buildCxoneUrl(context.baseUrl, "agents", agent.agentId),
    author_name: fullName || undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(agent.emailAddress && { email: agent.emailAddress }),
      ...(agent.teamName && { teamName: agent.teamName }),
      ...(agent.profileName && { profileName: agent.profileName }),
      isActive: String(agent.isActive),
    },
  };
}

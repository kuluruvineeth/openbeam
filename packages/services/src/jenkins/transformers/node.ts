import type { JenkinsTransformContext } from "@openbeam/types/services/connectors/jenkins";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JenkinsNode } from "../api/nodes";

function extractArchitecture(node: JenkinsNode): string | undefined {
  const arch = node.monitorData?.["hudson.node_monitors.ArchitectureMonitor"];
  return typeof arch === "string" ? arch : undefined;
}

function buildNodeContent(node: JenkinsNode): string {
  const parts: string[] = [];

  if (node.description) {
    parts.push(node.description);
  }

  parts.push(`Executors: ${node.numExecutors}`);
  parts.push(`Status: ${node.offline ? "Offline" : "Online"}`);
  parts.push(`Idle: ${node.idle ? "Yes" : "No"}`);

  if (node.temporarilyOffline) {
    parts.push("Temporarily Offline: Yes");
  }

  if (node.offlineCauseReason) {
    parts.push(`Offline Reason: ${node.offlineCauseReason}`);
  }

  if (node.jnlpAgent) {
    parts.push("Connection: JNLP Agent");
  }

  const arch = extractArchitecture(node);
  if (arch) {
    parts.push(`Architecture: ${arch}`);
  }

  return parts.join("\n");
}

function buildNodeMetadata(node: JenkinsNode): GenericDocument["metadata"] {
  return {
    nodeName: node.displayName,
    numExecutors: node.numExecutors,
    offline: node.offline,
    idle: node.idle,
    jnlpAgent: node.jnlpAgent,
    temporarilyOffline: node.temporarilyOffline,
    ...(extractArchitecture(node) && {
      architecture: extractArchitecture(node),
    }),
  };
}

export async function transformNode(
  node: JenkinsNode,
  context: JenkinsTransformContext
): Promise<GenericDocument> {
  const title =
    node.displayName === "master" || node.displayName === "Built-In Node"
      ? "Jenkins Controller"
      : `Agent: ${node.displayName}`;
  const content = buildNodeContent(node);
  const metadata = buildNodeMetadata(node);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_node_${encodeURIComponent(node.displayName)}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: node.displayName,
    document_type: "node",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "jenkins",
    url: `${context.instanceUrl}/computer/${encodeURIComponent(node.displayName)}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

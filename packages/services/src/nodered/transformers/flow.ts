import type {
  NodeRedFlow,
  NodeRedNode,
  NodeRedTransformContext,
} from "@openbeam/types/services/connectors/nodered";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildFlowContent(flow: NodeRedFlow, nodeCount: number): string {
  const parts: string[] = [];

  if (flow.label) {
    parts.push(`Label: ${flow.label}`);
  }

  parts.push(`Type: ${flow.type}`);

  if (flow.info) {
    parts.push(`Info: ${flow.info}`);
  }

  if (flow.env && flow.env.length > 0) {
    const envNames = flow.env.map((e) => e.name).join(", ");
    parts.push(`Environment Variables: ${envNames}`);
  }

  parts.push(`Node Count: ${nodeCount}`);

  return parts.join("\n");
}

function buildFlowMetadata(
  flow: NodeRedFlow,
  nodeCount: number
): GenericDocument["metadata"] {
  return {
    flowId: flow.id,
    type: flow.type,
    ...(flow.disabled != null && { disabled: flow.disabled }),
    nodeCount,
  };
}

export async function transformFlow(
  flow: NodeRedFlow,
  context: NodeRedTransformContext,
  flowNodes: NodeRedNode[]
): Promise<GenericDocument> {
  const nodeCount = flowNodes.length;
  const title = flow.label || `Flow ${flow.id}`;
  const content = buildFlowContent(flow, nodeCount);
  const metadata = buildFlowMetadata(flow, nodeCount);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_flow_${flow.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: flow.id,
    document_type: "automation_flow",
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "nodered",
    source_name: "Node-RED",
    url: `${context.baseUrl}/#flow/${flow.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformFlows(
  flows: NodeRedFlow[],
  context: NodeRedTransformContext,
  allNodes: NodeRedNode[]
): Promise<GenericDocument[]> {
  return Promise.all(
    flows.map((flow) => {
      const flowNodes = allNodes.filter((n) => n.z === flow.id);
      return transformFlow(flow, context, flowNodes);
    })
  );
}

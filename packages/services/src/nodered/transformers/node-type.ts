import type {
  NodeRedNodeType,
  NodeRedTransformContext,
} from "@openplane/types/services/connectors/nodered";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildNodeTypeContent(nodeType: NodeRedNodeType): string {
  const parts: string[] = [];

  parts.push(`Module: ${nodeType.module}`);
  parts.push(`Version: ${nodeType.version}`);

  if (nodeType.types.length > 0) {
    parts.push(`Types: ${nodeType.types.join(", ")}`);
  }

  parts.push(`Enabled: ${nodeType.enabled}`);

  return parts.join("\n");
}

function buildNodeTypeMetadata(
  nodeType: NodeRedNodeType
): GenericDocument["metadata"] {
  return {
    nodeTypeId: nodeType.id,
    module: nodeType.module,
    version: nodeType.version,
    enabled: nodeType.enabled,
    local: nodeType.local,
    ...(nodeType.types.length > 0 && {
      types: JSON.stringify(nodeType.types),
    }),
  };
}

export async function transformNodeType(
  nodeType: NodeRedNodeType,
  context: NodeRedTransformContext
): Promise<GenericDocument> {
  const title = nodeType.name || nodeType.id;
  const content = buildNodeTypeContent(nodeType);
  const metadata = buildNodeTypeMetadata(nodeType);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_nodetype_${nodeType.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: nodeType.id,
    document_type: "device_config",
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "nodered",
    source_name: "Node-RED",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformNodeTypes(
  nodeTypes: NodeRedNodeType[],
  context: NodeRedTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(nodeTypes.map((nt) => transformNodeType(nt, context)));
}

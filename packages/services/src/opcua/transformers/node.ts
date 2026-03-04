import type {
  OpcUaNode,
  OpcUaTransformContext,
} from "@openplane/types/services/connectors/opcua";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const NODE_CLASS_NAMES: Record<number, string> = {
  1: "Object",
  2: "Variable",
  4: "Method",
  8: "ObjectType",
  16: "VariableType",
  32: "ReferenceType",
  64: "DataType",
  128: "View",
};

function nodeClassLabel(nodeClass: number): string {
  return NODE_CLASS_NAMES[nodeClass] ?? `Unknown(${nodeClass})`;
}

function buildNodeContent(node: OpcUaNode): string {
  const parts: string[] = [];

  parts.push(`Browse Name: ${node.browseName}`);

  if (node.displayName && node.displayName !== node.browseName) {
    parts.push(`Display Name: ${node.displayName}`);
  }

  parts.push(`Node Class: ${nodeClassLabel(node.nodeClass)}`);

  if (node.typeDefinition) {
    parts.push(`Type Definition: ${node.typeDefinition}`);
  }

  if (node.dataType) {
    parts.push(`Data Type: ${node.dataType}`);
  }

  if (node.engineeringUnits) {
    parts.push(`Engineering Units: ${node.engineeringUnits}`);
  }

  if (node.value !== undefined && node.value !== null) {
    parts.push(`Value: ${stringifyValue(node.value)}`);
  }

  if (node.description) {
    parts.push(`Description: ${node.description}`);
  }

  return parts.join("\n");
}

function buildNodeMetadata(node: OpcUaNode): GenericDocument["metadata"] {
  return {
    nodeId: node.nodeId,
    browseName: node.browseName,
    nodeClass: nodeClassLabel(node.nodeClass),
    ...(node.dataType && { dataType: node.dataType }),
    ...(node.typeDefinition && { typeDefinition: node.typeDefinition }),
    ...(node.engineeringUnits && { engineeringUnits: node.engineeringUnits }),
    ...(node.value !== undefined &&
      node.value !== null && { value: stringifyValue(node.value) }),
  };
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export async function transformNode(
  node: OpcUaNode,
  context: OpcUaTransformContext
): Promise<GenericDocument> {
  const title = node.displayName || node.browseName;
  const content = buildNodeContent(node);
  const metadata = buildNodeMetadata(node);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_node_${encodeURIComponent(node.nodeId)}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: node.nodeId,
    document_type: "device_config",
    document_subtype: nodeClassLabel(node.nodeClass),
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "opcua",
    source_name: "OPC-UA",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformNodes(
  nodes: OpcUaNode[],
  context: OpcUaTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(nodes.map((node) => transformNode(node, context)));
}

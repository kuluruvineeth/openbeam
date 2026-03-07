import type {
  CompiledAgentConfig as BaseCompiledAgentConfig,
  BaseNodeData,
} from "@openbeam/types/canvas";
import type { Edge, Node } from "@xyflow/react";
import {
  type DetectedPattern,
  detectPatterns,
  getTopologicalOrder,
} from "./pattern-detector";

type AgentPattern = BaseCompiledAgentConfig["pattern"];

export interface CompiledAgentConfig {
  name: string;
  description: string;
  version: string;
  pattern: AgentPattern;
  nodes: CompiledNode[];
  edges: CompiledEdge[];
  entrypoint: string;
  exitpoints: string[];
  patterns: DetectedPattern[];
  metadata: {
    createdAt: string;
    nodeCount: number;
    edgeCount: number;
  };
}

export interface CompiledNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  inputs: { id: string; label: string; type: string }[];
  outputs: { id: string; label: string; type: string }[];
}

export interface CompiledEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: "data" | "control" | "error";
}

interface ExtendedNodeData extends BaseNodeData {
  config?: Record<string, unknown>;
  inputs?: { id: string; label: string; type: string }[];
  outputs?: { id: string; label: string; type: string }[];
}

export function compileAgentConfig(
  name: string,
  description: string,
  nodes: Node<BaseNodeData>[],
  edges: Edge[]
): CompiledAgentConfig {
  const patterns = detectPatterns(nodes, edges);
  const topOrder = getTopologicalOrder(nodes, edges);

  const startNode = nodes.find((n) => n.type === "start");
  const endNodes = nodes.filter((n) => n.type === "end");

  const compiledNodes = nodes.map((node) => compileNode(node));
  const compiledEdges = edges.map((edge) => compileEdge(edge));

  const pattern = inferAgentPattern(patterns, nodes);

  const lastNodeId = topOrder.at(-1);

  let exitpoints: string[];
  if (endNodes.length > 0) {
    exitpoints = endNodes.map((n) => n.id);
  } else if (lastNodeId) {
    exitpoints = [lastNodeId];
  } else {
    exitpoints = [];
  }

  return {
    name,
    description,
    version: "1.0.0",
    pattern,
    nodes: compiledNodes,
    edges: compiledEdges,
    entrypoint: startNode?.id ?? topOrder[0] ?? "",
    exitpoints,
    patterns,
    metadata: {
      createdAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
}

function compileNode(node: Node<BaseNodeData>): CompiledNode {
  const extendedData = node.data as ExtendedNodeData;

  return {
    id: node.id,
    type: node.type ?? "unknown",
    label: node.data.label ?? node.type ?? "Node",
    config: extendedData.config ?? {},
    inputs: extendedData.inputs ?? [],
    outputs: extendedData.outputs ?? [],
  };
}

function compileEdge(edge: Edge): CompiledEdge {
  const edgeData = edge.data as { edgeType?: string } | undefined;
  const edgeType = edgeData?.edgeType;

  let type: "data" | "control" | "error" = "data";
  if (edgeType === "control") {
    type = "control";
  } else if (edgeType === "error") {
    type = "error";
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type,
  };
}

function inferAgentPattern(
  patterns: DetectedPattern[],
  nodes: Node<BaseNodeData>[]
): AgentPattern {
  const hasParallel = patterns.some((p) => p.type === "parallel");
  const hasLoop = patterns.some((p) => p.type === "loop");
  const hasCondition = patterns.some((p) => p.type === "condition");
  const hasGenCritic = patterns.some((p) => p.type === "generator-critic");

  if (hasGenCritic) {
    return "generator-critic";
  }
  if (hasParallel && hasLoop) {
    return "coordinator";
  }
  if (hasParallel) {
    return "parallel";
  }
  if (hasLoop) {
    return "loop";
  }
  if (hasCondition) {
    return "coordinator";
  }

  const aiNodes = nodes.filter(
    (n) =>
      n.type === "llm" ||
      n.type === "rag" ||
      n.type === "summarize" ||
      n.type === "extract"
  );

  if (aiNodes.length > 1) {
    return "sequential";
  }
  if (aiNodes.length === 1) {
    return "llm";
  }

  return "sequential";
}

export function validateAgentConfig(config: CompiledAgentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.entrypoint) {
    errors.push("No entrypoint defined. Add a Start node.");
  }

  if (config.exitpoints.length === 0) {
    errors.push("No exit points defined. Add an End node.");
  }

  const nodeIds = new Set(config.nodes.map((n) => n.id));

  for (const edge of config.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target node: ${edge.target}`);
    }
  }

  const llmNodes = config.nodes.filter((n) => n.type === "llm");
  for (const llmNode of llmNodes) {
    if (!llmNode.config.model) {
      errors.push(`LLM node "${llmNode.label}" has no model configured.`);
    }
  }

  const conditionNodes = config.nodes.filter((n) => n.type === "condition");
  for (const condNode of conditionNodes) {
    if (!condNode.config.expression) {
      errors.push(
        `Condition node "${condNode.label}" has no expression configured.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function serializeAgentConfig(config: CompiledAgentConfig): string {
  return JSON.stringify(config, null, 2);
}

export function deserializeAgentConfig(json: string): CompiledAgentConfig {
  return JSON.parse(json) as CompiledAgentConfig;
}

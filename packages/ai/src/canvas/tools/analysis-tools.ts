import { z } from "zod";

import { defineTool, failure, success } from "../../tools/builder";
import type { CanvasConnection, CanvasNode, CanvasToolContext } from "../types";

const WORD_BOUNDARY_REGEX = /\W+/;

export const canvasAnalyzeWorkflowTool = defineTool({
  name: "canvas_analyze_workflow",
  description: `Analyze the workflow structure and provide insights.

USE THIS WHEN:
- User asks to review or analyze the workflow
- Checking for potential issues
- Understanding workflow complexity

RETURNS: Detailed analysis including patterns, issues, and suggestions.`,
  category: "canvas",
  searchKeywords: ["canvas", "analyze", "workflow", "review", "check"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeIds: z
      .array(z.string())
      .optional()
      .describe("Specific nodes to analyze (default: all)"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    let nodes = state.nodes;
    let connections = state.connections;

    if (params.nodeIds && params.nodeIds.length > 0) {
      const nodeIdSet = new Set(params.nodeIds);
      nodes = nodes.filter((n) => nodeIdSet.has(n.id));
      connections = connections.filter(
        (c) => nodeIdSet.has(c.sourceNodeId) && nodeIdSet.has(c.targetNodeId)
      );
    }

    const analysis = analyzeWorkflow(nodes, connections);

    return success(analysis, { source: "canvas" });
  },
});

export interface WorkflowAnalysis {
  summary: string;
  patterns: Array<{ type: string; description: string; nodeIds: string[] }>;
  issues: Array<{ severity: string; message: string; nodeIds: string[] }>;
  suggestions: Array<{ message: string; priority: number }>;
  metrics: {
    nodeCount: number;
    connectionCount: number;
    maxDepth: number;
    branchingFactor: number;
    hasLoops: boolean;
    hasParallelism: boolean;
  };
}

function analyzeWorkflow(
  nodes: CanvasNode[],
  connections: CanvasConnection[]
): WorkflowAnalysis {
  const patterns: WorkflowAnalysis["patterns"] = [];
  const issues: WorkflowAnalysis["issues"] = [];
  const suggestions: WorkflowAnalysis["suggestions"] = [];

  const adjacencyMap = buildAdjacencyMap(connections);

  const startNodes = nodes.filter((n) => n.type === "start");
  const endNodes = nodes.filter((n) => n.type === "end");
  const llmNodes = nodes.filter((n) => n.type === "llm");
  const ragNodes = nodes.filter((n) => n.type === "rag");
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  const loopNodes = nodes.filter((n) => n.type === "loop");
  const parallelSplitNodes = nodes.filter((n) => n.type === "parallelSplit");
  const parallelJoinNodes = nodes.filter((n) => n.type === "parallelJoin");

  if (startNodes.length === 0) {
    issues.push({
      severity: "error",
      message: "No start node found. Workflow needs a start node.",
      nodeIds: [],
    });
  } else if (startNodes.length > 1) {
    issues.push({
      severity: "warning",
      message:
        "Multiple start nodes found. Consider using a single entry point.",
      nodeIds: startNodes.map((n) => n.id),
    });
  }

  if (endNodes.length === 0) {
    issues.push({
      severity: "error",
      message: "No end node found. Workflow needs an end node.",
      nodeIds: [],
    });
  }

  const disconnectedNodes = nodes.filter((n) => {
    const hasIncoming = connections.some((c) => c.targetNodeId === n.id);
    const hasOutgoing = connections.some((c) => c.sourceNodeId === n.id);
    return (
      !(hasIncoming || hasOutgoing) && n.type !== "start" && n.type !== "end"
    );
  });

  if (disconnectedNodes.length > 0) {
    issues.push({
      severity: "warning",
      message: "Found disconnected nodes that are not part of the workflow.",
      nodeIds: disconnectedNodes.map((n) => n.id),
    });
  }

  const deadEndNodes = nodes.filter((n) => {
    const hasOutgoing = connections.some((c) => c.sourceNodeId === n.id);
    return !hasOutgoing && n.type !== "end";
  });

  if (deadEndNodes.length > 0) {
    issues.push({
      severity: "warning",
      message: "Found nodes with no outgoing connections (dead ends).",
      nodeIds: deadEndNodes.map((n) => n.id),
    });
  }

  if (ragNodes.length > 0 && llmNodes.length > 0) {
    for (const ragNode of ragNodes) {
      const targets = adjacencyMap.get(ragNode.id) || [];
      const llmTarget = targets.find((t) => llmNodes.some((l) => l.id === t));
      if (llmTarget) {
        patterns.push({
          type: "rag-llm",
          description: "RAG + LLM pattern: retrieve context before generating",
          nodeIds: [ragNode.id, llmTarget],
        });
      }
    }
  }

  if (parallelSplitNodes.length > 0) {
    for (const split of parallelSplitNodes) {
      const branchTargets = adjacencyMap.get(split.id) || [];
      if (branchTargets.length >= 2) {
        patterns.push({
          type: "parallel",
          description: `Parallel execution with ${branchTargets.length} branches`,
          nodeIds: [split.id, ...branchTargets],
        });
      }
    }
  }

  for (const llm1 of llmNodes) {
    const targets = adjacencyMap.get(llm1.id) || [];
    for (const target of targets) {
      const targetNode = nodes.find((n) => n.id === target);
      if (targetNode?.type === "llm") {
        const backConnections = adjacencyMap.get(target) || [];
        if (backConnections.includes(llm1.id)) {
          patterns.push({
            type: "generator-critic",
            description:
              "Generator-Critic pattern: LLM generates, another LLM critiques",
            nodeIds: [llm1.id, target],
          });
        }
      }
    }
  }

  const hasLoops = loopNodes.length > 0 || detectCycles(nodes, adjacencyMap);
  const hasParallelism = parallelSplitNodes.length > 0;

  if (hasLoops) {
    patterns.push({
      type: "iterative",
      description: "Contains iterative/loop patterns",
      nodeIds: loopNodes.map((n) => n.id),
    });
  }

  if (conditionNodes.length > 0) {
    patterns.push({
      type: "conditional",
      description: "Contains conditional branching",
      nodeIds: conditionNodes.map((n) => n.id),
    });
  }

  if (parallelSplitNodes.length !== parallelJoinNodes.length) {
    issues.push({
      severity: "warning",
      message:
        "Unbalanced parallel split/join nodes. Each split should have a matching join.",
      nodeIds: [
        ...parallelSplitNodes.map((n) => n.id),
        ...parallelJoinNodes.map((n) => n.id),
      ],
    });
  }

  if (llmNodes.length > 5) {
    suggestions.push({
      message:
        "Consider grouping related LLM calls or using parallel execution to reduce latency.",
      priority: 2,
    });
  }

  if (ragNodes.length === 0 && llmNodes.length > 0) {
    suggestions.push({
      message:
        "Consider adding RAG nodes to ground LLM responses in actual data.",
      priority: 1,
    });
  }

  if (conditionNodes.length === 0 && nodes.length > 5) {
    suggestions.push({
      message:
        "Consider adding condition nodes for error handling or input validation.",
      priority: 3,
    });
  }

  const maxDepth = calculateMaxDepth(nodes, connections);
  const branchingFactor = connections.length / Math.max(nodes.length, 1);

  const summary = buildSummary(nodes, patterns, issues);

  return {
    summary,
    patterns,
    issues,
    suggestions: suggestions.sort((a, b) => a.priority - b.priority),
    metrics: {
      nodeCount: nodes.length,
      connectionCount: connections.length,
      maxDepth,
      branchingFactor: Math.round(branchingFactor * 100) / 100,
      hasLoops,
      hasParallelism,
    },
  };
}

function buildAdjacencyMap(
  connections: CanvasConnection[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const conn of connections) {
    const targets = map.get(conn.sourceNodeId) || [];
    targets.push(conn.targetNodeId);
    map.set(conn.sourceNodeId, targets);
  }
  return map;
}

function detectCycles(
  nodes: CanvasNode[],
  adjacencyMap: Map<string, string[]>
): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyMap.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id)) {
      return true;
    }
  }

  return false;
}

function calculateMaxDepth(
  nodes: CanvasNode[],
  connections: CanvasConnection[]
): number {
  const adjacencyMap = buildAdjacencyMap(connections);
  const depths = new Map<string, number>();

  const startNodes = nodes.filter((n) => n.type === "start");
  const queue = startNodes.map((n) => ({ id: n.id, depth: 0 }));

  for (const s of startNodes) {
    depths.set(s.id, 0);
  }

  let maxDepth = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const neighbors = adjacencyMap.get(current.id) || [];
    for (const neighbor of neighbors) {
      const newDepth = current.depth + 1;
      const existingDepth = depths.get(neighbor);

      if (existingDepth === undefined || newDepth > existingDepth) {
        depths.set(neighbor, newDepth);
        queue.push({ id: neighbor, depth: newDepth });
        maxDepth = Math.max(maxDepth, newDepth);
      }
    }
  }

  return maxDepth;
}

function buildSummary(
  nodes: CanvasNode[],
  patterns: WorkflowAnalysis["patterns"],
  issues: WorkflowAnalysis["issues"]
): string {
  const nodeTypes = new Map<string, number>();
  for (const node of nodes) {
    const count = nodeTypes.get(node.type) || 0;
    nodeTypes.set(node.type, count + 1);
  }

  const typesList = Array.from(nodeTypes.entries())
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  const patternsList =
    patterns.length > 0
      ? patterns.map((p) => p.type).join(", ")
      : "none detected";

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let healthStatus = "healthy";
  if (errorCount > 0) {
    healthStatus = "has errors";
  } else if (warningCount > 0) {
    healthStatus = "has warnings";
  }

  return `Workflow with ${nodes.length} nodes (${typesList}). Patterns: ${patternsList}. Status: ${healthStatus}.`;
}

export const canvasValidateWorkflowTool = defineTool({
  name: "canvas_validate_workflow",
  description: `Validate the workflow for execution readiness.

USE THIS WHEN:
- Before compiling/running the workflow
- Checking if workflow is complete and valid

RETURNS: Validation results with pass/fail status and error details.`,
  category: "canvas",
  searchKeywords: ["canvas", "validate", "check", "verify"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({}),

  async execute(_params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const errors: Array<{ code: string; message: string; nodeId?: string }> =
      [];

    const startNodes = state.nodes.filter((n) => n.type === "start");
    const endNodes = state.nodes.filter((n) => n.type === "end");

    if (startNodes.length === 0) {
      errors.push({
        code: "NO_START",
        message: "Workflow must have a start node",
      });
    }

    if (endNodes.length === 0) {
      errors.push({
        code: "NO_END",
        message: "Workflow must have an end node",
      });
    }

    const llmNodes = state.nodes.filter((n) => n.type === "llm");
    for (const llm of llmNodes) {
      const config = llm.content as Record<string, unknown> | undefined;
      if (!config?.model) {
        errors.push({
          code: "LLM_NO_MODEL",
          message: "LLM node must have a model configured",
          nodeId: llm.id,
        });
      }
    }

    const conditionNodes = state.nodes.filter((n) => n.type === "condition");
    for (const cond of conditionNodes) {
      const config = cond.content as Record<string, unknown> | undefined;
      if (!config?.expression) {
        errors.push({
          code: "CONDITION_NO_EXPRESSION",
          message: "Condition node must have an expression",
          nodeId: cond.id,
        });
      }

      const outgoing = state.connections.filter(
        (c) => c.sourceNodeId === cond.id
      );
      const hasTrueBranch = outgoing.some((c) =>
        c.sourceHandle?.includes("true")
      );
      const hasFalseBranch = outgoing.some((c) =>
        c.sourceHandle?.includes("false")
      );

      if (!(hasTrueBranch && hasFalseBranch)) {
        errors.push({
          code: "CONDITION_MISSING_BRANCH",
          message: "Condition node should have both true and false branches",
          nodeId: cond.id,
        });
      }
    }

    const adjacencyMap = buildAdjacencyMap(state.connections);
    if (startNodes.length > 0 && endNodes.length > 0) {
      const reachable = new Set<string>();
      const queue = [startNodes[0]?.id].filter(
        (id): id is string => id !== undefined
      );

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || reachable.has(current)) {
          continue;
        }
        reachable.add(current);
        const neighbors = adjacencyMap.get(current) || [];
        queue.push(...neighbors);
      }

      const unreachableFromStart = state.nodes.filter(
        (n) => !reachable.has(n.id) && n.type !== "start"
      );

      if (unreachableFromStart.length > 0) {
        errors.push({
          code: "UNREACHABLE_NODES",
          message: `${unreachableFromStart.length} node(s) are not reachable from start`,
        });
      }
    }

    const isValid = errors.length === 0;

    return success(
      {
        valid: isValid,
        errors,
        errorCount: errors.length,
        nodeCount: state.nodes.length,
        connectionCount: state.connections.length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasFindSimilarNodesTool = defineTool({
  name: "canvas_find_similar_nodes",
  description: `Find nodes similar to a given node based on type and configuration.

USE THIS WHEN:
- Looking for nodes with similar settings
- Finding potential duplicates

RETURNS: List of similar nodes with similarity scores.`,
  category: "canvas",
  searchKeywords: ["canvas", "similar", "find", "match"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    nodeId: z.string().describe("ID of the reference node"),
    threshold: z
      .number()
      .optional()
      .default(0.5)
      .describe("Minimum similarity score (0-1)"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const referenceNode = state.nodes.find((n) => n.id === params.nodeId);

    if (!referenceNode) {
      return failure("NOT_FOUND", `Reference node not found: ${params.nodeId}`);
    }

    const similarities: Array<{
      nodeId: string;
      score: number;
      reasons: string[];
    }> = [];

    for (const node of state.nodes) {
      if (node.id === params.nodeId) {
        continue;
      }

      const result = calculateSimilarity(referenceNode, node);
      if (result.score >= params.threshold) {
        similarities.push({
          nodeId: node.id,
          score: result.score,
          reasons: result.reasons,
        });
      }
    }

    similarities.sort((a, b) => b.score - a.score);

    return success(
      {
        referenceNodeId: params.nodeId,
        referenceNodeType: referenceNode.type,
        similarNodes: similarities,
        foundCount: similarities.length,
      },
      { source: "canvas" }
    );
  },
});

function calculateSimilarity(
  a: CanvasNode,
  b: CanvasNode
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (a.type === b.type) {
    score += 0.5;
    reasons.push("Same node type");
  }

  if (a.content && b.content) {
    const aContent =
      typeof a.content === "string" ? a.content : JSON.stringify(a.content);
    const bContent =
      typeof b.content === "string" ? b.content : JSON.stringify(b.content);

    if (aContent === bContent) {
      score += 0.4;
      reasons.push("Identical content");
    } else {
      const aWords = new Set(aContent.toLowerCase().split(WORD_BOUNDARY_REGEX));
      const bWords = new Set(bContent.toLowerCase().split(WORD_BOUNDARY_REGEX));
      const intersection = [...aWords].filter((w) => bWords.has(w));
      const union = new Set([...aWords, ...bWords]);
      const jaccard = intersection.length / union.size;

      if (jaccard > 0.3) {
        score += jaccard * 0.3;
        reasons.push("Similar content");
      }
    }
  }

  if (JSON.stringify(a.style) === JSON.stringify(b.style)) {
    score += 0.1;
    reasons.push("Same styling");
  }

  return { score: Math.min(score, 1), reasons };
}

export const analysisTools = [
  canvasAnalyzeWorkflowTool,
  canvasValidateWorkflowTool,
  canvasFindSimilarNodesTool,
];

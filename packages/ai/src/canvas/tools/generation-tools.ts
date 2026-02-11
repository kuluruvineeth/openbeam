import { z } from "zod";
import { defineTool, failure, success } from "../../tools/builder";
import type {
  CanvasConnection,
  CanvasNode,
  CanvasToolContext,
  Position,
} from "../types";

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const canvasGenerateWorkflowTool = defineTool({
  name: "canvas_generate_workflow",
  description: `Generate a complete workflow from a natural language description.

USE THIS WHEN:
- User describes a workflow in plain language
- Creating a new agent from scratch
- User says "build", "create", or "make" a workflow

RETURNS: Generated nodes and connections for the workflow.`,
  category: "canvas",
  searchKeywords: ["canvas", "generate", "workflow", "create", "build"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    description: z
      .string()
      .describe("Natural language description of the workflow to generate"),
    startPosition: PositionSchema.optional()
      .default({ x: 100, y: 100 })
      .describe("Starting position for the generated workflow"),
    spacing: z
      .number()
      .optional()
      .default(200)
      .describe("Spacing between generated nodes"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.applyPatch) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const workflow = parseWorkflowDescription(
      params.description,
      params.startPosition ?? { x: 100, y: 100 },
      params.spacing ?? 200
    );

    const operations: Array<{ op: "add"; path: string; value: unknown }> = [];

    for (const node of workflow.nodes) {
      operations.push({
        op: "add",
        path: "/nodes/-",
        value: node,
      });
    }

    for (const connection of workflow.connections) {
      operations.push({
        op: "add",
        path: "/connections/-",
        value: connection,
      });
    }

    await canvasCtx.applyPatch({
      operations,
      description: "Generate workflow from description",
    });

    return success(
      {
        generatedNodes: workflow.nodes.length,
        generatedConnections: workflow.connections.length,
        nodeIds: workflow.nodes.map((n) => n.id),
      },
      { source: "canvas" }
    );
  },
});

function parseWorkflowDescription(
  description: string,
  startPosition: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];
  const lowerDesc = description.toLowerCase();

  const startNode: CanvasNode = {
    id: generateId("node"),
    type: "start",
    position: { x: startPosition.x, y: startPosition.y },
    content: "Start",
    zIndex: 1,
    locked: false,
    visible: true,
  };
  nodes.push(startNode);

  let currentX = startPosition.x + spacing;
  let lastNodeId = startNode.id;

  if (
    lowerDesc.includes("search") ||
    lowerDesc.includes("find") ||
    lowerDesc.includes("query")
  ) {
    const ragNode: CanvasNode = {
      id: generateId("node"),
      type: "rag",
      position: { x: currentX, y: startPosition.y },
      content: { label: "Search & Retrieve" },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(ragNode);
    connections.push(createConnection(lastNodeId, ragNode.id));
    lastNodeId = ragNode.id;
    currentX += spacing;
  }

  if (
    lowerDesc.includes("analyze") ||
    lowerDesc.includes("process") ||
    lowerDesc.includes("llm") ||
    lowerDesc.includes("think")
  ) {
    const llmNode: CanvasNode = {
      id: generateId("node"),
      type: "llm",
      position: { x: currentX, y: startPosition.y },
      content: { label: "Process with LLM", model: "claude-sonnet-4-5" },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(llmNode);
    connections.push(createConnection(lastNodeId, llmNode.id));
    lastNodeId = llmNode.id;
    currentX += spacing;
  }

  if (
    lowerDesc.includes("if") ||
    lowerDesc.includes("condition") ||
    lowerDesc.includes("check")
  ) {
    const conditionNode: CanvasNode = {
      id: generateId("node"),
      type: "condition",
      position: { x: currentX, y: startPosition.y },
      content: {
        label: "Check Condition",
        expression: "data.success === true",
      },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(conditionNode);
    connections.push(createConnection(lastNodeId, conditionNode.id));
    lastNodeId = conditionNode.id;
    currentX += spacing;
  }

  if (
    lowerDesc.includes("loop") ||
    lowerDesc.includes("repeat") ||
    lowerDesc.includes("iterate")
  ) {
    const loopNode: CanvasNode = {
      id: generateId("node"),
      type: "loop",
      position: { x: currentX, y: startPosition.y },
      content: { label: "Loop", maxIterations: 10 },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(loopNode);
    connections.push(createConnection(lastNodeId, loopNode.id));
    lastNodeId = loopNode.id;
    currentX += spacing;
  }

  if (
    lowerDesc.includes("parallel") ||
    lowerDesc.includes("concurrent") ||
    lowerDesc.includes("branch")
  ) {
    const splitNode: CanvasNode = {
      id: generateId("node"),
      type: "parallelSplit",
      position: { x: currentX, y: startPosition.y },
      content: { label: "Parallel Split" },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(splitNode);
    connections.push(createConnection(lastNodeId, splitNode.id));

    const joinNode: CanvasNode = {
      id: generateId("node"),
      type: "parallelJoin",
      position: { x: currentX + spacing, y: startPosition.y },
      content: { label: "Parallel Join" },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(joinNode);
    connections.push(createConnection(splitNode.id, joinNode.id));

    lastNodeId = joinNode.id;
    currentX += spacing * 2;
  }

  if (
    lowerDesc.includes("transform") ||
    lowerDesc.includes("map") ||
    lowerDesc.includes("convert")
  ) {
    const mapNode: CanvasNode = {
      id: generateId("node"),
      type: "map",
      position: { x: currentX, y: startPosition.y },
      content: { label: "Transform Data", expression: "item" },
      zIndex: 1,
      locked: false,
      visible: true,
    };
    nodes.push(mapNode);
    connections.push(createConnection(lastNodeId, mapNode.id));
    lastNodeId = mapNode.id;
    currentX += spacing;
  }

  const endNode: CanvasNode = {
    id: generateId("node"),
    type: "end",
    position: { x: currentX, y: startPosition.y },
    content: "End",
    zIndex: 1,
    locked: false,
    visible: true,
  };
  nodes.push(endNode);
  connections.push(createConnection(lastNodeId, endNode.id));

  return { nodes, connections };
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createConnection(
  sourceId: string,
  targetId: string
): CanvasConnection {
  return {
    id: generateId("conn"),
    sourceNodeId: sourceId,
    targetNodeId: targetId,
    type: "arrow",
  };
}

export const canvasSuggestNextNodeTool = defineTool({
  name: "canvas_suggest_next_node",
  description: `Suggest the next node type based on current workflow context.

USE THIS WHEN:
- User is building a workflow step by step
- Need to recommend what comes next

RETURNS: Suggested node types with explanations.`,
  category: "canvas",
  searchKeywords: ["canvas", "suggest", "next", "recommend"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    afterNodeId: z.string().describe("ID of the node to suggest after"),
    workflowGoal: z.string().optional().describe("Optional goal context"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();
    const afterNode = state.nodes.find((n) => n.id === params.afterNodeId);

    if (!afterNode) {
      return failure("NOT_FOUND", `Node not found: ${params.afterNodeId}`);
    }

    const suggestions = getSuggestionsForNode(afterNode, params.workflowGoal);

    return success(
      { suggestions, afterNodeType: afterNode.type },
      { source: "canvas" }
    );
  },
});

function getSuggestionsForNode(
  node: CanvasNode,
  _goal?: string
): Array<{ type: string; reason: string; priority: number }> {
  const suggestions: Array<{ type: string; reason: string; priority: number }> =
    [];

  switch (node.type) {
    case "start":
      suggestions.push(
        { type: "llm", reason: "Process input with an LLM", priority: 1 },
        {
          type: "rag",
          reason: "Search for relevant context first",
          priority: 2,
        },
        { type: "condition", reason: "Add a decision point", priority: 3 }
      );
      break;

    case "rag":
      suggestions.push(
        { type: "llm", reason: "Process retrieved context", priority: 1 },
        {
          type: "filter",
          reason: "Filter results before processing",
          priority: 2,
        },
        {
          type: "condition",
          reason: "Check if results were found",
          priority: 3,
        }
      );
      break;

    case "llm":
      suggestions.push(
        {
          type: "condition",
          reason: "Branch based on LLM output",
          priority: 1,
        },
        { type: "end", reason: "Complete the workflow", priority: 2 },
        { type: "llm", reason: "Chain another LLM call", priority: 3 },
        { type: "template", reason: "Format the output", priority: 4 }
      );
      break;

    case "condition":
      suggestions.push(
        { type: "llm", reason: "Process each branch", priority: 1 },
        { type: "end", reason: "Terminate this branch", priority: 2 },
        { type: "loop", reason: "Retry on condition", priority: 3 }
      );
      break;

    case "loop":
      suggestions.push(
        { type: "llm", reason: "Process each iteration", priority: 1 },
        { type: "condition", reason: "Check loop continuation", priority: 2 },
        { type: "end", reason: "Exit after loop", priority: 3 }
      );
      break;

    case "parallelSplit":
      suggestions.push(
        { type: "llm", reason: "Parallel LLM processing", priority: 1 },
        { type: "rag", reason: "Parallel search", priority: 2 },
        { type: "http", reason: "Parallel API calls", priority: 3 }
      );
      break;

    case "parallelJoin":
      suggestions.push(
        { type: "llm", reason: "Synthesize parallel results", priority: 1 },
        { type: "template", reason: "Combine outputs", priority: 2 },
        { type: "end", reason: "Complete after merge", priority: 3 }
      );
      break;

    default:
      suggestions.push(
        { type: "llm", reason: "Add LLM processing", priority: 1 },
        { type: "condition", reason: "Add decision logic", priority: 2 },
        { type: "end", reason: "Complete workflow", priority: 3 }
      );
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

export const canvasGenerateFromTemplateTool = defineTool({
  name: "canvas_generate_from_template",
  description: `Generate a workflow from a predefined template.

USE THIS WHEN:
- User wants a common workflow pattern
- Quick-starting with a known agent architecture

AVAILABLE TEMPLATES:
- rag-answer: RAG-based Q&A agent
- generator-critic: Generate and refine loop
- parallel-research: Multi-source research
- conditional-routing: Route based on input
- data-pipeline: ETL-style processing

RETURNS: Generated nodes and connections.`,
  category: "canvas",
  searchKeywords: ["canvas", "template", "pattern", "preset"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    template: z
      .enum([
        "rag-answer",
        "generator-critic",
        "parallel-research",
        "conditional-routing",
        "data-pipeline",
      ])
      .describe("Template to use"),
    startPosition: PositionSchema.optional()
      .default({ x: 100, y: 200 })
      .describe("Starting position"),
    customization: z
      .record(z.string(), z.string())
      .optional()
      .describe("Template-specific customization options"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.applyPatch) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const workflow = generateTemplateWorkflow(
      params.template,
      params.startPosition ?? { x: 100, y: 200 },
      params.customization
    );

    const operations: Array<{ op: "add"; path: string; value: unknown }> = [];

    for (const node of workflow.nodes) {
      operations.push({ op: "add", path: "/nodes/-", value: node });
    }

    for (const connection of workflow.connections) {
      operations.push({ op: "add", path: "/connections/-", value: connection });
    }

    await canvasCtx.applyPatch({
      operations,
      description: `Generate from template: ${params.template}`,
    });

    return success(
      {
        template: params.template,
        generatedNodes: workflow.nodes.length,
        generatedConnections: workflow.connections.length,
        nodeIds: workflow.nodes.map((n) => n.id),
      },
      { source: "canvas" }
    );
  },
});

function generateTemplateWorkflow(
  template: string,
  startPos: Position,
  _customization?: Record<string, string>
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const spacing = 200;

  switch (template) {
    case "rag-answer":
      return generateRagAnswerTemplate(startPos, spacing);
    case "generator-critic":
      return generateGeneratorCriticTemplate(startPos, spacing);
    case "parallel-research":
      return generateParallelResearchTemplate(startPos, spacing);
    case "conditional-routing":
      return generateConditionalRoutingTemplate(startPos, spacing);
    case "data-pipeline":
      return generateDataPipelineTemplate(startPos, spacing);
    default:
      return { nodes: [], connections: [] };
  }
}

function generateRagAnswerTemplate(
  startPos: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];

  const start = createTemplateNode("start", "Start", startPos);
  const rag = createTemplateNode("rag", "Search Context", {
    x: startPos.x + spacing,
    y: startPos.y,
  });
  const llm = createTemplateNode("llm", "Generate Answer", {
    x: startPos.x + spacing * 2,
    y: startPos.y,
  });
  const end = createTemplateNode("end", "End", {
    x: startPos.x + spacing * 3,
    y: startPos.y,
  });

  nodes.push(start, rag, llm, end);
  connections.push(
    createConnection(start.id, rag.id),
    createConnection(rag.id, llm.id),
    createConnection(llm.id, end.id)
  );

  return { nodes, connections };
}

function generateGeneratorCriticTemplate(
  startPos: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];

  const start = createTemplateNode("start", "Start", startPos);
  const generator = createTemplateNode("llm", "Generator", {
    x: startPos.x + spacing,
    y: startPos.y,
  });
  const critic = createTemplateNode("llm", "Critic", {
    x: startPos.x + spacing * 2,
    y: startPos.y,
  });
  const condition = createTemplateNode("condition", "Good Enough?", {
    x: startPos.x + spacing * 3,
    y: startPos.y,
  });
  const end = createTemplateNode("end", "End", {
    x: startPos.x + spacing * 4,
    y: startPos.y,
  });

  nodes.push(start, generator, critic, condition, end);
  connections.push(
    createConnection(start.id, generator.id),
    createConnection(generator.id, critic.id),
    createConnection(critic.id, condition.id),
    { ...createConnection(condition.id, end.id), sourceHandle: "true" },
    { ...createConnection(condition.id, generator.id), sourceHandle: "false" }
  );

  return { nodes, connections };
}

function generateParallelResearchTemplate(
  startPos: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];

  const start = createTemplateNode("start", "Start", startPos);
  const split = createTemplateNode("parallelSplit", "Split", {
    x: startPos.x + spacing,
    y: startPos.y,
  });
  const rag1 = createTemplateNode("rag", "Search Source 1", {
    x: startPos.x + spacing * 2,
    y: startPos.y - 80,
  });
  const rag2 = createTemplateNode("rag", "Search Source 2", {
    x: startPos.x + spacing * 2,
    y: startPos.y + 80,
  });
  const join = createTemplateNode("parallelJoin", "Join", {
    x: startPos.x + spacing * 3,
    y: startPos.y,
  });
  const llm = createTemplateNode("llm", "Synthesize", {
    x: startPos.x + spacing * 4,
    y: startPos.y,
  });
  const end = createTemplateNode("end", "End", {
    x: startPos.x + spacing * 5,
    y: startPos.y,
  });

  nodes.push(start, split, rag1, rag2, join, llm, end);
  connections.push(
    createConnection(start.id, split.id),
    createConnection(split.id, rag1.id),
    createConnection(split.id, rag2.id),
    createConnection(rag1.id, join.id),
    createConnection(rag2.id, join.id),
    createConnection(join.id, llm.id),
    createConnection(llm.id, end.id)
  );

  return { nodes, connections };
}

function generateConditionalRoutingTemplate(
  startPos: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];

  const start = createTemplateNode("start", "Start", startPos);
  const condition = createTemplateNode("condition", "Route", {
    x: startPos.x + spacing,
    y: startPos.y,
  });
  const path1 = createTemplateNode("llm", "Path A", {
    x: startPos.x + spacing * 2,
    y: startPos.y - 80,
  });
  const path2 = createTemplateNode("llm", "Path B", {
    x: startPos.x + spacing * 2,
    y: startPos.y + 80,
  });
  const end = createTemplateNode("end", "End", {
    x: startPos.x + spacing * 3,
    y: startPos.y,
  });

  nodes.push(start, condition, path1, path2, end);
  connections.push(
    createConnection(start.id, condition.id),
    { ...createConnection(condition.id, path1.id), sourceHandle: "true" },
    { ...createConnection(condition.id, path2.id), sourceHandle: "false" },
    createConnection(path1.id, end.id),
    createConnection(path2.id, end.id)
  );

  return { nodes, connections };
}

function generateDataPipelineTemplate(
  startPos: Position,
  spacing: number
): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];

  const start = createTemplateNode("start", "Start", startPos);
  const map = createTemplateNode("map", "Transform", {
    x: startPos.x + spacing,
    y: startPos.y,
  });
  const filter = createTemplateNode("filter", "Filter", {
    x: startPos.x + spacing * 2,
    y: startPos.y,
  });
  const template = createTemplateNode("template", "Format", {
    x: startPos.x + spacing * 3,
    y: startPos.y,
  });
  const end = createTemplateNode("end", "End", {
    x: startPos.x + spacing * 4,
    y: startPos.y,
  });

  nodes.push(start, map, filter, template, end);
  connections.push(
    createConnection(start.id, map.id),
    createConnection(map.id, filter.id),
    createConnection(filter.id, template.id),
    createConnection(template.id, end.id)
  );

  return { nodes, connections };
}

function createTemplateNode(
  type: string,
  label: string,
  position: Position
): CanvasNode {
  return {
    id: generateId("node"),
    type,
    position,
    content: { label },
    zIndex: 1,
    locked: false,
    visible: true,
  };
}

export const generationTools = [
  canvasGenerateWorkflowTool,
  canvasSuggestNextNodeTool,
  canvasGenerateFromTemplateTool,
];

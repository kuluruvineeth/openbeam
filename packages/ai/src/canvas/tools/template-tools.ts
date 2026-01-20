import { z } from "zod";

import { defineTool, failure, success } from "../../tools/builder";
import type { CanvasConnection, CanvasNode, CanvasToolContext } from "../types";

export const canvasSaveAsTemplateTool = defineTool({
  name: "canvas_save_as_template",
  description: `Save the current workflow or selection as a reusable template.

USE THIS WHEN:
- User wants to save a workflow pattern for reuse
- Creating a template from a working workflow

RETURNS: Template ID and metadata.`,
  category: "canvas",
  searchKeywords: ["canvas", "template", "save", "store"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    name: z.string().describe("Name for the template"),
    description: z
      .string()
      .optional()
      .describe("Description of what this template does"),
    nodeIds: z
      .array(z.string())
      .optional()
      .describe("Specific nodes to include (default: all)"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    let nodes: CanvasNode[];
    let connections: CanvasConnection[];

    if (params.nodeIds && params.nodeIds.length > 0) {
      const nodeIdSet = new Set(params.nodeIds);
      nodes = state.nodes.filter((n) => nodeIdSet.has(n.id));
      connections = state.connections.filter(
        (c) => nodeIdSet.has(c.sourceNodeId) && nodeIdSet.has(c.targetNodeId)
      );
    } else {
      nodes = state.nodes;
      connections = state.connections;
    }

    if (nodes.length === 0) {
      return failure("INVALID_INPUT", "No nodes to save as template");
    }

    const normalizedNodes = normalizePositions(nodes);

    const nodeTypes = new Set(nodes.map((n) => n.type));
    const hasLlm = nodeTypes.has("llm");
    const hasRag = nodeTypes.has("rag");
    const hasCondition = nodeTypes.has("condition");
    const hasLoop = nodeTypes.has("loop");
    const hasParallel = nodeTypes.has("parallelSplit");

    const autoTags: string[] = [];
    if (hasLlm) {
      autoTags.push("llm");
    }
    if (hasRag) {
      autoTags.push("rag");
    }
    if (hasCondition) {
      autoTags.push("conditional");
    }
    if (hasLoop) {
      autoTags.push("loop");
    }
    if (hasParallel) {
      autoTags.push("parallel");
    }

    const templateId = generateTemplateId();

    const template = {
      id: templateId,
      name: params.name,
      description: params.description,
      tags: [...autoTags, ...(params.tags || [])],
      nodes: normalizedNodes,
      connections,
      metadata: {
        createdAt: new Date().toISOString(),
        nodeCount: nodes.length,
        connectionCount: connections.length,
        nodeTypes: Array.from(nodeTypes),
      },
    };

    return success(
      {
        templateId,
        templateName: params.name,
        savedNodes: nodes.length,
        savedConnections: connections.length,
        template,
      },
      { source: "canvas" }
    );
  },
});

function normalizePositions(nodes: CanvasNode[]): CanvasNode[] {
  if (nodes.length === 0) {
    return [];
  }

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));

  return nodes.map((node) => ({
    ...node,
    id: `template_${node.id}`,
    position: {
      x: node.position.x - minX,
      y: node.position.y - minY,
    },
  }));
}

function generateTemplateId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const canvasApplyTemplateTool = defineTool({
  name: "canvas_apply_template",
  description: `Apply a template to the canvas at a specified position.

USE THIS WHEN:
- User wants to insert a saved template
- Applying a pattern from the template library

RETURNS: IDs of created nodes and connections.`,
  category: "canvas",
  searchKeywords: ["canvas", "template", "apply", "insert"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    templateData: z
      .object({
        nodes: z.array(z.any()),
        connections: z.array(z.any()),
      })
      .describe("Template data containing nodes and connections"),
    position: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional()
      .default({ x: 100, y: 100 })
      .describe("Position to place the template"),
    prefix: z.string().optional().describe("Prefix for generated IDs"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.applyPatch) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const position = params.position ?? { x: 100, y: 100 };
    const prefix = params.prefix || `inst_${Date.now()}_`;

    const idMapping = new Map<string, string>();
    const newNodes: CanvasNode[] = [];
    const newConnections: CanvasConnection[] = [];

    for (const templateNode of params.templateData.nodes as CanvasNode[]) {
      const newId = prefix + Math.random().toString(36).slice(2, 8);
      idMapping.set(templateNode.id, newId);

      const newNode: CanvasNode = {
        ...templateNode,
        id: newId,
        position: {
          x: templateNode.position.x + position.x,
          y: templateNode.position.y + position.y,
        },
        locked: false,
      };
      newNodes.push(newNode);
    }

    for (const templateConn of params.templateData
      .connections as CanvasConnection[]) {
      const newSourceId = idMapping.get(templateConn.sourceNodeId);
      const newTargetId = idMapping.get(templateConn.targetNodeId);

      if (newSourceId && newTargetId) {
        const newConn: CanvasConnection = {
          ...templateConn,
          id: `${prefix}conn_${Math.random().toString(36).slice(2, 8)}`,
          sourceNodeId: newSourceId,
          targetNodeId: newTargetId,
        };
        newConnections.push(newConn);
      }
    }

    const operations: Array<{ op: "add"; path: string; value: unknown }> = [];

    for (const node of newNodes) {
      operations.push({ op: "add", path: "/nodes/-", value: node });
    }

    for (const conn of newConnections) {
      operations.push({ op: "add", path: "/connections/-", value: conn });
    }

    await canvasCtx.applyPatch({
      operations,
      description: "Apply template",
    });

    return success(
      {
        createdNodes: newNodes.map((n) => n.id),
        createdConnections: newConnections.map((c) => c.id),
        idMapping: Object.fromEntries(idMapping),
      },
      { source: "canvas" }
    );
  },
});

export const canvasListTemplatesTool = defineTool({
  name: "canvas_list_templates",
  description: `List available workflow templates.

USE THIS WHEN:
- User wants to see available templates
- Browsing template library

RETURNS: List of available templates with metadata.`,
  category: "canvas",
  searchKeywords: ["canvas", "template", "list", "browse"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    limit: z.number().optional().default(20).describe("Maximum results"),
  }),

  execute(params) {
    const builtInTemplates = [
      {
        id: "tmpl_rag_answer",
        name: "RAG Q&A",
        description: "Simple RAG-based question answering workflow",
        tags: ["rag", "llm", "basic"],
        nodeCount: 4,
        pattern: "sequential",
      },
      {
        id: "tmpl_generator_critic",
        name: "Generator-Critic",
        description: "Generate and refine output through critique loop",
        tags: ["llm", "loop", "quality"],
        nodeCount: 5,
        pattern: "loop",
      },
      {
        id: "tmpl_parallel_research",
        name: "Parallel Research",
        description: "Search multiple sources in parallel and synthesize",
        tags: ["rag", "parallel", "research"],
        nodeCount: 7,
        pattern: "parallel",
      },
      {
        id: "tmpl_conditional_routing",
        name: "Conditional Routing",
        description: "Route to different processors based on input type",
        tags: ["conditional", "llm", "routing"],
        nodeCount: 5,
        pattern: "conditional",
      },
      {
        id: "tmpl_data_pipeline",
        name: "Data Pipeline",
        description: "Transform, filter, and format data",
        tags: ["transform", "filter", "data"],
        nodeCount: 5,
        pattern: "sequential",
      },
      {
        id: "tmpl_multi_agent",
        name: "Multi-Agent Collaboration",
        description: "Multiple specialized agents working together",
        tags: ["llm", "parallel", "advanced"],
        nodeCount: 9,
        pattern: "coordinator",
      },
    ];

    let templates = builtInTemplates;

    if (params.tags && params.tags.length > 0) {
      const tagSet = new Set(params.tags);
      templates = templates.filter((t) =>
        t.tags.some((tag) => tagSet.has(tag))
      );
    }

    templates = templates.slice(0, params.limit);

    return success(
      {
        templates,
        totalCount: templates.length,
        availableTags: Array.from(
          new Set(builtInTemplates.flatMap((t) => t.tags))
        ).sort(),
      },
      { source: "canvas" }
    );
  },
});

export const canvasExportWorkflowTool = defineTool({
  name: "canvas_export_workflow",
  description: `Export the workflow to a shareable format.

USE THIS WHEN:
- User wants to export or share the workflow
- Creating a backup

RETURNS: Serialized workflow data.`,
  category: "canvas",
  searchKeywords: ["canvas", "export", "share", "download"],
  stakes: "low",
  reversibility: "easy",

  parameters: z.object({
    format: z
      .enum(["json", "minimal"])
      .optional()
      .default("json")
      .describe("Export format"),
    includeMetadata: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include metadata in export"),
  }),

  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!canvasCtx.getState) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const state = await canvasCtx.getState();

    let exportData: unknown;

    if (params.format === "minimal") {
      exportData = {
        nodes: state.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          content: n.content,
        })),
        connections: state.connections.map((c) => ({
          source: c.sourceNodeId,
          target: c.targetNodeId,
          sourceHandle: c.sourceHandle,
          targetHandle: c.targetHandle,
        })),
      };
    } else {
      exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        nodes: state.nodes,
        connections: state.connections,
        viewport: state.viewport,
        metadata: params.includeMetadata
          ? {
              nodeCount: state.nodes.length,
              connectionCount: state.connections.length,
              nodeTypes: Array.from(new Set(state.nodes.map((n) => n.type))),
            }
          : undefined,
      };
    }

    const serialized = JSON.stringify(exportData, null, 2);

    return success(
      {
        format: params.format,
        data: exportData,
        serialized,
        byteSize: new TextEncoder().encode(serialized).length,
      },
      { source: "canvas" }
    );
  },
});

export const canvasImportWorkflowTool = defineTool({
  name: "canvas_import_workflow",
  description: `Import a workflow from exported data.

USE THIS WHEN:
- User wants to load a previously exported workflow
- Importing a shared workflow

RETURNS: IDs of imported nodes and connections.`,
  category: "canvas",
  searchKeywords: ["canvas", "import", "load", "restore"],
  stakes: "medium",
  reversibility: "easy",

  parameters: z.object({
    data: z
      .object({
        nodes: z.array(z.any()),
        connections: z.array(z.any()),
      })
      .describe("Workflow data to import"),
    position: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional()
      .describe("Position offset for imported nodes"),
    clearExisting: z
      .boolean()
      .optional()
      .default(false)
      .describe("Clear existing canvas before import"),
  }),

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex import logic with ID mapping
  async execute(params, ctx) {
    const canvasCtx = ctx as unknown as CanvasToolContext;

    if (!(canvasCtx.getState && canvasCtx.applyPatch)) {
      return failure("INVALID_STATE", "Canvas context not available");
    }

    const operations: Array<
      | { op: "add"; path: string; value: unknown }
      | { op: "remove"; path: string }
    > = [];

    if (params.clearExisting) {
      const state = await canvasCtx.getState();

      for (let i = state.connections.length - 1; i >= 0; i--) {
        operations.push({ op: "remove", path: `/connections/${i}` });
      }
      for (let i = state.nodes.length - 1; i >= 0; i--) {
        operations.push({ op: "remove", path: `/nodes/${i}` });
      }
    }

    const offset = params.position ?? { x: 0, y: 0 };
    const idMapping = new Map<string, string>();
    const prefix = `imp_${Date.now()}_`;

    const importedNodes: string[] = [];
    const importedConnections: string[] = [];

    for (const node of params.data.nodes as CanvasNode[]) {
      const newId = prefix + Math.random().toString(36).slice(2, 8);
      idMapping.set(node.id, newId);

      const newNode: CanvasNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
      };

      operations.push({ op: "add", path: "/nodes/-", value: newNode });
      importedNodes.push(newId);
    }

    for (const conn of params.data.connections as CanvasConnection[]) {
      const sourceId =
        conn.sourceNodeId ?? (conn as unknown as { source?: string }).source;
      const targetId =
        conn.targetNodeId ?? (conn as unknown as { target?: string }).target;

      const newSourceId = idMapping.get(sourceId);
      const newTargetId = idMapping.get(targetId);

      if (newSourceId && newTargetId) {
        const newId = `${prefix}conn_${Math.random().toString(36).slice(2, 8)}`;
        const newConn: CanvasConnection = {
          id: newId,
          sourceNodeId: newSourceId,
          targetNodeId: newTargetId,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
          type: conn.type ?? "arrow",
        };

        operations.push({ op: "add", path: "/connections/-", value: newConn });
        importedConnections.push(newId);
      }
    }

    await canvasCtx.applyPatch({
      operations,
      description: "Import workflow",
    });

    return success(
      {
        importedNodes,
        importedConnections,
        nodeCount: importedNodes.length,
        connectionCount: importedConnections.length,
        idMapping: Object.fromEntries(idMapping),
      },
      { source: "canvas" }
    );
  },
});

export const templateTools = [
  canvasSaveAsTemplateTool,
  canvasApplyTemplateTool,
  canvasListTemplatesTool,
  canvasExportWorkflowTool,
  canvasImportWorkflowTool,
];

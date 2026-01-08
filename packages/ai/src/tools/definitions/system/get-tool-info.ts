import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { toolRegistry } from "../../registry";

export const getToolInfoTool = defineTool({
  name: "get_tool_info",
  description: `Get detailed information about a specific tool before using it.

USE THIS WHEN:
- You see a tool name mentioned but need its full description and parameters
- You need to understand how to use a specific tool
- You want to know what parameters a tool accepts

DO NOT USE WHEN:
- You already know how to use the tool
- The tool info is in your system prompt

RETURNS: Tool name, description, category, and parameter schema.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["tool", "info", "help", "parameters", "description"],

  parameters: z.object({
    toolName: z
      .string()
      .min(1)
      .describe("The name of the tool to get information about"),
  }),

  execute(params, _ctx) {
    const startTime = performance.now();

    const info = toolRegistry.getToolInfo(params.toolName);

    if (!info) {
      return Promise.resolve(
        failure(
          "NOT_FOUND",
          `Tool not found: ${params.toolName}. Use list_tools to see available tools.`
        )
      );
    }

    return Promise.resolve(
      success(
        {
          name: info.name,
          description: info.description,
          category: info.category,
          inputSchema: info.inputSchema,
        },
        {
          latencyMs: performance.now() - startTime,
          source: "registry",
          cached: true,
        }
      )
    );
  },
});

export const listToolsTool = defineTool({
  name: "list_tools",
  description: `List all available tools with their names and brief descriptions.

USE THIS WHEN:
- You need to discover what tools are available
- User asks what capabilities you have
- You're unsure which tool to use for a task

RETURNS: Array of tool names with one-line descriptions.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["list", "tools", "available", "capabilities"],

  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe(
        "Filter by category: search, rag, documents, connectors, data, system"
      ),
  }),

  execute(params, _ctx) {
    const startTime = performance.now();

    let tools = toolRegistry.getToolNamesWithDescriptions();

    if (params.category) {
      const registered = toolRegistry.getAll();
      const categoryTools = registered
        .filter((t) => t.metadata.category === params.category)
        .map((t) => t.metadata.name);

      tools = tools.filter((t) => categoryTools.includes(t.name));
    }

    return Promise.resolve(
      success(
        {
          tools,
          count: tools.length,
        },
        {
          latencyMs: performance.now() - startTime,
          source: "registry",
        }
      )
    );
  },
});

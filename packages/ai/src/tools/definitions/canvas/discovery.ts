import type { CanvasNodeType, NodeCategory } from "@openbeam/types/canvas";
import { CanvasNodeTypeSchema } from "@openbeam/types/canvas";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

interface NodeTypeInfo {
  type: CanvasNodeType;
  category: NodeCategory;
  description: string;
  configFields: string[];
}

const NODE_TYPE_INFO: Record<CanvasNodeType, Omit<NodeTypeInfo, "type">> = {
  start: {
    category: "control",
    description: "Entry point of the workflow. Configure inputs and trigger.",
    configFields: ["triggerType", "schedule", "webhookPath", "eventType"],
  },
  end: {
    category: "control",
    description: "Exit point of the workflow. Configure outputs.",
    configFields: ["outputType", "webhookUrl", "notificationChannel"],
  },
  condition: {
    category: "control",
    description: "Branch execution based on conditions.",
    configFields: ["expression", "branches", "defaultBranch"],
  },
  loop: {
    category: "control",
    description: "Iterate over collections or repeat while condition is true.",
    configFields: ["type", "collection", "condition", "times", "maxIterations"],
  },
  parallel_split: {
    category: "control",
    description: "Split execution into parallel branches.",
    configFields: ["branches"],
  },
  parallel_join: {
    category: "control",
    description: "Join parallel branches back together.",
    configFields: ["branches", "joinType", "timeout"],
  },
  retry: {
    category: "control",
    description: "Retry failed operations with backoff.",
    configFields: [
      "maxAttempts",
      "backoffMs",
      "exponential",
      "retryOnErrors",
      "jitterMs",
    ],
  },
  try_catch: {
    category: "control",
    description: "Handle errors gracefully with fallback logic.",
    configFields: [
      "catchErrors",
      "fallbackValue",
      "rethrowUnhandled",
      "logErrors",
    ],
  },
  llm: {
    category: "ai",
    description:
      "Call a language model with a prompt. Supports tools and structured output.",
    configFields: [
      "model",
      "systemPrompt",
      "temperature",
      "maxTokens",
      "tools",
      "responseFormat",
      "outputSchema",
    ],
  },
  image: {
    category: "ai",
    description: "Generate or process images using AI models.",
    configFields: ["model", "prompt", "size", "quality", "style"],
  },
  audio: {
    category: "ai",
    description: "Process or generate audio using AI models.",
    configFields: ["model", "input", "voice", "format", "speed"],
  },
  video: {
    category: "ai",
    description: "Process or generate video using AI models.",
    configFields: ["model", "input", "duration", "resolution", "format"],
  },
  rag: {
    category: "ai",
    description: "Retrieve relevant documents and generate grounded responses.",
    configFields: [
      "searchType",
      "topK",
      "rerank",
      "minScore",
      "connectorTypes",
      "model",
      "systemPrompt",
    ],
  },
  summarize: {
    category: "ai",
    description: "Summarize text content in different styles.",
    configFields: ["style", "maxLength", "model"],
  },
  extract: {
    category: "ai",
    description: "Extract structured data from text using a schema.",
    configFields: ["schema", "examples", "model"],
  },
  classify: {
    category: "ai",
    description: "Classify text into predefined categories.",
    configFields: ["categories", "allowMultiple", "model"],
  },
  embeddings: {
    category: "ai",
    description: "Generate vector embeddings for text.",
    configFields: ["model", "dimensions", "batchSize", "normalize"],
  },
  rerank: {
    category: "ai",
    description: "Rerank search results by relevance.",
    configFields: ["model", "topK", "threshold", "returnScores"],
  },
  chunk: {
    category: "ai",
    description: "Split text into chunks for processing.",
    configFields: ["strategy", "maxChunkSize", "overlap", "preserveStructure"],
  },
  merge: {
    category: "ai",
    description: "Merge multiple text inputs into one.",
    configFields: ["strategy", "separator", "maxLength", "dedupeThreshold"],
  },
  transform: {
    category: "transform",
    description: "Transform data using JMESPath, JSONata, or JavaScript.",
    configFields: ["expression", "language"],
  },
  filter: {
    category: "transform",
    description: "Filter data based on conditions.",
    configFields: ["expression", "language"],
  },
  template: {
    category: "transform",
    description: "Render templates with dynamic data.",
    configFields: ["template", "language"],
  },
  code: {
    category: "transform",
    description: "Execute custom JavaScript or Python code.",
    configFields: ["code", "runtime", "timeoutMs"],
  },
  approval: {
    category: "human",
    description: "Pause workflow and wait for human approval.",
    configFields: ["message", "approvers", "timeoutMs", "autoApprove"],
  },
  input: {
    category: "human",
    description:
      "Collect structured input from a user via a form. Config uses a 'fields' array where each field has id, type (text/textarea/number/boolean/date/select/multiselect/email/url/file/password/hidden), label, placeholder, helperText, defaultValue, options (for select/multiselect), validation ({ required, minLength, maxLength, min, max, pattern }), and width (full/half).",
    configFields: [
      "prompt",
      "fields",
      "submitLabel",
      "allowSkip",
      "skipLabel",
      "timeoutMs",
      "timeoutAction",
    ],
  },
  notify: {
    category: "human",
    description: "Send notifications via email, Slack, or webhook.",
    configFields: ["channel", "template", "recipients", "webhookUrl"],
  },
  annotation: {
    category: "human",
    description: "Add visual notes or comments to the canvas.",
    configFields: ["color"],
  },
  connector: {
    category: "integration",
    description: "Interact with a connected data source.",
    configFields: ["connectorType", "operation", "params"],
  },
  connector_action: {
    category: "integration",
    description: "Execute an action on a connected service.",
    configFields: ["connectorType", "operation", "params"],
  },
  tool: {
    category: "integration",
    description: "Call a registered tool by ID.",
    configFields: ["toolId", "params"],
  },
  http_request: {
    category: "integration",
    description: "Make HTTP requests to external APIs.",
    configFields: [
      "url",
      "method",
      "headers",
      "body",
      "queryParams",
      "timeoutMs",
      "retryOn5xx",
      "validateStatus",
      "responseType",
    ],
  },
  database_query: {
    category: "integration",
    description: "Execute database queries.",
    configFields: [
      "connectionId",
      "query",
      "parameters",
      "timeout",
      "readOnly",
      "maxRows",
    ],
  },
  graphql_query: {
    category: "integration",
    description: "Execute GraphQL queries.",
    configFields: [
      "endpoint",
      "query",
      "variables",
      "headers",
      "operationName",
      "timeoutMs",
    ],
  },
  trigger_manual: {
    category: "trigger",
    description: "Trigger workflow manually with optional input schema.",
    configFields: ["inputSchema", "requiredPermissions"],
  },
  trigger_schedule: {
    category: "trigger",
    description: "Trigger workflow on a schedule (cron).",
    configFields: [
      "cron",
      "timezone",
      "enabled",
      "startDate",
      "endDate",
      "maxRuns",
      "runOnStart",
      "catchUpMissed",
    ],
  },
  trigger_webhook: {
    category: "trigger",
    description: "Trigger workflow via webhook.",
    configFields: [
      "path",
      "method",
      "authentication",
      "secret",
      "signatureHeader",
      "validationSchema",
      "rateLimit",
      "allowedIps",
    ],
  },
  trigger_event: {
    category: "trigger",
    description: "Trigger workflow on system or connector events.",
    configFields: [
      "eventType",
      "eventSource",
      "connectorType",
      "filter",
      "debounceMs",
      "batchSize",
      "batchWindowMs",
    ],
  },
  memory_read: {
    category: "memory",
    description: "Read data from persistent memory.",
    configFields: ["key", "namespace", "scope", "defaultValue"],
  },
  memory_write: {
    category: "memory",
    description: "Write data to persistent memory.",
    configFields: ["key", "namespace", "scope", "ttlMs", "overwrite"],
  },
  memory_search: {
    category: "memory",
    description: "Search memory using semantic similarity.",
    configFields: [
      "query",
      "namespace",
      "scope",
      "topK",
      "threshold",
      "includeMetadata",
    ],
  },
  sub_workflow: {
    category: "orchestration",
    description: "Call another workflow as a sub-workflow.",
    configFields: [
      "workflowId",
      "version",
      "inputMappings",
      "outputMappings",
      "waitForCompletion",
      "timeoutMs",
      "inheritContext",
    ],
  },
  agent_call: {
    category: "orchestration",
    description: "Call an AI agent with tools and memory.",
    configFields: [
      "agentId",
      "prompt",
      "tools",
      "model",
      "maxSteps",
      "temperature",
      "systemPromptOverride",
    ],
  },
  parallel_map: {
    category: "orchestration",
    description: "Process collection items in parallel.",
    configFields: [
      "collection",
      "maxConcurrency",
      "continueOnError",
      "timeout",
      "batchSize",
    ],
  },
};

export const canvasListNodeTypesTool = defineTool({
  name: "canvas_list_node_types",
  description:
    "List all available node types organized by category with descriptions. Use this to discover what types of nodes can be added to the workflow.",
  category: "canvas",
  parameters: z.object({
    category: z
      .enum([
        "control",
        "ai",
        "transform",
        "integration",
        "human",
        "trigger",
        "memory",
        "orchestration",
      ])
      .optional()
      .describe("Filter by category (omit for all)"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const allTypes = Object.entries(NODE_TYPE_INFO).map(([type, info]) => ({
      type: type as CanvasNodeType,
      ...info,
    }));

    const filteredTypes = params.category
      ? allTypes.filter((t) => t.category === params.category)
      : allTypes;

    const byCategory = filteredTypes.reduce<
      Record<string, { type: string; description: string }[]>
    >((acc, t) => {
      const arr = acc[t.category] ?? [];
      arr.push({
        type: t.type,
        description: t.description,
      });
      acc[t.category] = arr;
      return acc;
    }, {});

    return success({
      totalCount: filteredTypes.length,
      categories: byCategory,
    });
  },
});

const CONNECTOR_ACTIONS: Record<string, readonly string[]> = {
  SLACK: [
    "monitor channels",
    "send messages",
    "search messages",
    "list channels",
  ],
  GMAIL: ["read emails", "send emails", "search inbox", "monitor labels"],
  GOOGLE_DRIVE: [
    "search files",
    "read documents",
    "list folders",
    "monitor changes",
  ],
  NOTION: [
    "search pages",
    "read databases",
    "query collections",
    "monitor updates",
  ],
  LINEAR: [
    "list issues",
    "create issues",
    "search projects",
    "monitor updates",
  ],
  GITHUB: ["search repos", "list issues", "read PRs", "monitor events"],
  JIRA: ["search issues", "create tickets", "list projects", "monitor boards"],
  CONFLUENCE: ["search pages", "read spaces", "list content"],
  HUBSPOT: ["search contacts", "list deals", "query companies"],
  SALESFORCE: ["search records", "list opportunities", "query accounts"],
};

export const canvasListConnectorsTool = defineTool({
  name: "canvas_list_connectors",
  description:
    "List the team's connected integrations that can be used in connector nodes. Shows which data sources are available for the workflow.",
  category: "canvas",
  parameters: z.object({
    status: z
      .enum(["active", "error", "all"])
      .optional()
      .default("active")
      .describe("Filter by connector status"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: async (params, ctx) => {
    const list = ctx.services.connectors?.list;
    if (!list) {
      return success({
        connectors: [] as Array<{
          id: string;
          type: string;
          name: string;
          status: string;
          availableActions: readonly string[];
        }>,
        totalCount: 0,
        message: "Connector service not available" as string | undefined,
      });
    }

    const connectors = await list(ctx.teamId);

    const filtered =
      params.status === "all"
        ? connectors
        : connectors.filter((c) =>
            params.status === "active"
              ? c.status === "ACTIVE"
              : c.status === "ERROR"
          );

    return success({
      connectors: filtered.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        status: c.status,
        availableActions: CONNECTOR_ACTIONS[c.type] ?? [],
      })),
      totalCount: filtered.length,
      message: undefined as string | undefined,
    });
  },
});

export const canvasGetNodeSchemaTool = defineTool({
  name: "canvas_get_node_schema",
  description:
    "Get the configuration schema for a specific node type. Use this to understand what config fields are available and how to configure a node.",
  category: "canvas",
  parameters: z.object({
    nodeType: CanvasNodeTypeSchema.describe("The node type to get schema for"),
  }),
  stakes: "low",
  reversibility: "easy",
  execute: (params) => {
    const info = NODE_TYPE_INFO[params.nodeType];

    if (!info) {
      return failure("NOT_FOUND", `Unknown node type: ${params.nodeType}`, {
        retryable: false,
      });
    }

    return success({
      type: params.nodeType,
      category: info.category,
      description: info.description,
      configFields: info.configFields,
      usage: `Use canvas_add_node with type="${params.nodeType}" and config object containing: ${info.configFields.join(", ")}`,
    });
  },
});

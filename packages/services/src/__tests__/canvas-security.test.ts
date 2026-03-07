import { describe, expect, it, mock } from "bun:test";
import type { ExecutionPlanNode } from "@openbeam/types/canvas";
import { executeCanvasNode } from "../canvas/execute";

mock.module("../canvas/registry", () => ({
  getCanvasNodeExecutor: mock(() =>
    mock(() => Promise.resolve({ success: true }))
  ),
  // biome-ignore lint/suspicious/noEmptyBlockStatements: mock returning void
  registerCanvasNodeExecutor: mock(() => {}),
}));

mock.module("../canvas/defaults", () => ({
  // biome-ignore lint/suspicious/noEmptyBlockStatements: mock returning void
  registerDefaultCanvasNodeExecutors: mock(() => {}),
}));

describe("Canvas Execution Security", () => {
  describe("Authorization Checks", () => {
    it("rejects connector execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "connector",
        data: {
          config: {
            connectorId: "connector-1",
            connectorType: "slack",
            operation: "message_send",
            params: {},
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "connector" requires execution context'
      );
    });

    it("rejects connector_action execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "connector_action",
        data: {
          config: {
            connectorId: "connector-1",
            actionId: "action_1",
            params: {},
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "connector_action" requires execution context'
      );
    });

    it("rejects tool execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "tool",
        data: {
          config: {
            toolName: "search_documents",
            params: { query: "test" },
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "tool" requires execution context'
      );
    });

    it("rejects rag execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "rag",
        data: {
          config: {
            query: "test query",
            searchLimit: 10,
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "rag" requires execution context'
      );
    });

    it("rejects database_query execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "database_query",
        data: {
          config: {
            query: "SELECT 1",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "database_query" requires execution context'
      );
    });

    it("rejects graphql_query execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "graphql_query",
        data: {
          config: {
            query: "{ test }",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "graphql_query" requires execution context'
      );
    });

    it("rejects http_request execution without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "http_request",
        data: {
          config: {
            url: "https://example.com",
            method: "GET",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
        'Node type "http_request" requires execution context'
      );
    });

    it("allows transform node without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "transform",
        data: {
          config: {
            expression: "$.value",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(
        executeCanvasNode({ node, input: { value: 1 } })
      ).resolves.toBeDefined();
    });

    it("allows filter node without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "filter",
        data: {
          config: {
            condition: "$.value > 0",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(
        executeCanvasNode({ node, input: { value: 1 } })
      ).resolves.toBeDefined();
    });

    it("allows llm node without context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "llm",
        data: {
          config: {
            model: "gpt-4",
            prompt: "test prompt",
          },
        },
        inbound: [],
        outbound: [],
      };

      await expect(
        executeCanvasNode({ node, input: {} })
      ).resolves.toBeDefined();
    });

    it("allows execution with valid context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "connector",
        data: {
          config: {
            connectorId: "connector-1",
            connectorType: "slack",
            operation: "message_send",
            params: {},
          },
        },
        inbound: [],
        outbound: [],
      };

      const context = {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-123",
        triggeredById: "user-1",
      };

      await expect(
        executeCanvasNode({ node, input: {}, context })
      ).resolves.toBeDefined();
    });

    it("allows tool execution with valid context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "tool",
        data: {
          config: {
            toolName: "search_documents",
            params: { query: "test" },
          },
        },
        inbound: [],
        outbound: [],
      };

      const context = {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-123",
        triggeredById: "user-1",
      };

      await expect(
        executeCanvasNode({ node, input: {}, context })
      ).resolves.toBeDefined();
    });

    it("allows rag execution with valid context", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "rag",
        data: {
          config: {
            query: "test query",
            searchLimit: 10,
          },
        },
        inbound: [],
        outbound: [],
      };

      const context = {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-123",
        triggeredById: "user-1",
      };

      await expect(
        executeCanvasNode({ node, input: {}, context })
      ).resolves.toBeDefined();
    });
  });

  describe("Context Requirements Enforcement", () => {
    const contextRequiredNodeTypes = [
      "connector",
      "connector_action",
      "tool",
      "rag",
      "database_query",
      "graphql_query",
      "http_request",
    ] as const;

    const contextOptionalNodeTypes = [
      "transform",
      "filter",
      "llm",
      "extract",
      "summarize",
      "classify",
    ] as const;

    for (const nodeType of contextRequiredNodeTypes) {
      it(`enforces context requirement for ${nodeType} nodes`, async () => {
        const node: ExecutionPlanNode = {
          id: "node-1",
          type: nodeType,
          data: {
            config: {},
          },
          inbound: [],
          outbound: [],
        };

        await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
          `Node type "${nodeType}" requires execution context`
        );
      });
    }

    for (const nodeType of contextOptionalNodeTypes) {
      it(`allows ${nodeType} nodes without context`, async () => {
        const node: ExecutionPlanNode = {
          id: "node-1",
          type: nodeType,
          data: {
            config: {},
          },
          inbound: [],
          outbound: [],
        };

        await expect(
          executeCanvasNode({ node, input: {} })
        ).resolves.toBeDefined();
      });
    }
  });

  describe("Context Validation", () => {
    it("requires all required context fields for protected nodes", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "connector",
        data: {
          config: {
            connectorId: "connector-1",
            connectorType: "slack",
          },
        },
        inbound: [],
        outbound: [],
      };

      const validContext = {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-123",
        triggeredById: "user-1",
      };

      await expect(
        executeCanvasNode({ node, input: {}, context: validContext })
      ).resolves.toBeDefined();
    });

    it("accepts context with optional fields", async () => {
      const node: ExecutionPlanNode = {
        id: "node-1",
        type: "connector",
        data: {
          config: {
            connectorId: "connector-1",
            connectorType: "slack",
          },
        },
        inbound: [],
        outbound: [],
      };

      const contextWithOptionalFields = {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-123",
        triggeredById: "user-1",
        metadata: { key: "value" },
      };

      await expect(
        executeCanvasNode({
          node,
          input: {},
          context: contextWithOptionalFields,
        })
      ).resolves.toBeDefined();
    });
  });

  describe("Node Type Security Matrix", () => {
    const securityMatrix = [
      {
        nodeType: "connector",
        requiresContext: true,
        reason: "accesses team-scoped connectors",
      },
      {
        nodeType: "connector_action",
        requiresContext: true,
        reason: "executes connector actions",
      },
      {
        nodeType: "tool",
        requiresContext: true,
        reason: "accesses team-scoped tools",
      },
      {
        nodeType: "rag",
        requiresContext: true,
        reason: "searches team-scoped documents",
      },
      {
        nodeType: "database_query",
        requiresContext: true,
        reason: "queries team-scoped database",
      },
      {
        nodeType: "graphql_query",
        requiresContext: true,
        reason: "queries external GraphQL APIs",
      },
      {
        nodeType: "http_request",
        requiresContext: true,
        reason: "makes external HTTP requests",
      },
      {
        nodeType: "transform",
        requiresContext: false,
        reason: "pure data transformation",
      },
      {
        nodeType: "filter",
        requiresContext: false,
        reason: "pure data filtering",
      },
      {
        nodeType: "llm",
        requiresContext: false,
        reason: "stateless LLM calls",
      },
    ] as const;

    for (const { nodeType, requiresContext, reason } of securityMatrix) {
      it(`${nodeType} node ${requiresContext ? "requires" : "does not require"} context (${reason})`, async () => {
        const node: ExecutionPlanNode = {
          id: "node-1",
          type: nodeType as ExecutionPlanNode["type"],
          data: {
            config: {},
          },
          inbound: [],
          outbound: [],
        };

        if (requiresContext) {
          await expect(executeCanvasNode({ node, input: {} })).rejects.toThrow(
            `Node type "${nodeType}" requires execution context`
          );
        } else {
          await expect(
            executeCanvasNode({ node, input: {} })
          ).resolves.toBeDefined();
        }
      });
    }
  });
});

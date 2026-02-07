import { describe, expect, it } from "bun:test";
import {
  type CompiledAgentConfig,
  CompiledAgentConfigSchema,
} from "../compiler";
import {
  ConnectorActionCategorySchema,
  ConnectorActionDefinitionSchema,
  ConnectorActionExecuteParamsSchema,
  ConnectorActionExecuteResultSchema,
  ConnectorActionNodeConfigSchema,
} from "../connector-actions";
import { AgentCanvasEdgeSchema, type EdgeType } from "../edges";
import { type ExecutionStatus, ExecutionStatusSchema } from "../execution";
import {
  AgentCallNodeConfigSchema,
  AgentCanvasNodeSchema,
  CanvasNodeTypeSchema,
  ChunkNodeConfigSchema,
  DatabaseQueryNodeConfigSchema,
  EmbeddingsNodeConfigSchema,
  GraphqlQueryNodeConfigSchema,
  HttpRequestNodeConfigSchema,
  MemoryReadNodeConfigSchema,
  MemorySearchNodeConfigSchema,
  MemoryWriteNodeConfigSchema,
  MergeNodeConfigSchema,
  NODE_CATEGORIES,
  type NodeCategory,
  NodeCategorySchema,
  ParallelMapNodeConfigSchema,
  RerankNodeConfigSchema,
  RetryNodeConfigSchema,
  SubWorkflowNodeConfigSchema,
  TriggerEventNodeConfigSchema,
  TriggerManualNodeConfigSchema,
  TriggerScheduleNodeConfigSchema,
  TriggerWebhookNodeConfigSchema,
  TryCatchNodeConfigSchema,
} from "../nodes";
import {
  EventSubscriptionSchema,
  ScheduleNextRunSchema,
  TriggerConfigSchema,
  TriggerExecutionContextSchema,
  TriggerNodeDataSchema,
  WebhookRegistrationSchema,
} from "../triggers";

describe("canvas type schemas", () => {
  describe("NodeCategorySchema", () => {
    it("accepts all valid categories", () => {
      const categories: NodeCategory[] = [
        "control",
        "ai",
        "transform",
        "integration",
        "human",
        "trigger",
        "memory",
        "orchestration",
      ];
      for (const cat of categories) {
        expect(NodeCategorySchema.parse(cat)).toBe(cat);
      }
    });

    it("rejects invalid categories", () => {
      expect(() => NodeCategorySchema.parse("invalid")).toThrow();
    });
  });

  describe("CanvasNodeTypeSchema", () => {
    it("accepts all 44 node types", () => {
      const nodeTypes = CanvasNodeTypeSchema.options;
      expect(nodeTypes).toHaveLength(44);
      for (const type of nodeTypes) {
        expect(CanvasNodeTypeSchema.parse(type)).toBe(type);
      }
    });

    it("rejects invalid node types", () => {
      expect(() => CanvasNodeTypeSchema.parse("invalid_node")).toThrow();
    });
  });

  describe("NODE_CATEGORIES mapping", () => {
    it("maps all node types to categories", () => {
      const nodeTypes = CanvasNodeTypeSchema.options;
      for (const type of nodeTypes) {
        expect(NODE_CATEGORIES[type]).toBeDefined();
        expect(
          NodeCategorySchema.safeParse(NODE_CATEGORIES[type]).success
        ).toBe(true);
      }
    });

    it("maps control nodes correctly", () => {
      const controlNodes = [
        "start",
        "end",
        "condition",
        "loop",
        "parallel_split",
        "parallel_join",
        "retry",
        "try_catch",
      ];
      for (const node of controlNodes) {
        expect(NODE_CATEGORIES[node as keyof typeof NODE_CATEGORIES]).toBe(
          "control"
        );
      }
    });

    it("maps ai nodes correctly", () => {
      const aiNodes = [
        "llm",
        "image",
        "audio",
        "video",
        "rag",
        "summarize",
        "extract",
        "classify",
        "embeddings",
        "rerank",
        "chunk",
        "merge",
      ];
      for (const node of aiNodes) {
        expect(NODE_CATEGORIES[node as keyof typeof NODE_CATEGORIES]).toBe(
          "ai"
        );
      }
    });

    it("maps trigger nodes correctly", () => {
      const triggerNodes = [
        "trigger_manual",
        "trigger_schedule",
        "trigger_webhook",
        "trigger_event",
      ];
      for (const node of triggerNodes) {
        expect(NODE_CATEGORIES[node as keyof typeof NODE_CATEGORIES]).toBe(
          "trigger"
        );
      }
    });

    it("maps memory nodes correctly", () => {
      const memoryNodes = ["memory_read", "memory_write", "memory_search"];
      for (const node of memoryNodes) {
        expect(NODE_CATEGORIES[node as keyof typeof NODE_CATEGORIES]).toBe(
          "memory"
        );
      }
    });

    it("maps orchestration nodes correctly", () => {
      const orchestrationNodes = ["sub_workflow", "agent_call", "parallel_map"];
      for (const node of orchestrationNodes) {
        expect(NODE_CATEGORIES[node as keyof typeof NODE_CATEGORIES]).toBe(
          "orchestration"
        );
      }
    });
  });

  describe("AgentCanvasNodeSchema", () => {
    it("parses valid node", () => {
      const node = {
        id: "node-1",
        type: "start",
        position: { x: 100, y: 200 },
        data: { label: "Start" },
      };
      const parsed = AgentCanvasNodeSchema.parse(node);
      expect(parsed.id).toBe("node-1");
      expect(parsed.type).toBe("start");
      expect(parsed.position).toEqual({ x: 100, y: 200 });
    });

    it("parses new node types", () => {
      const newNodeTypes = [
        "retry",
        "embeddings",
        "memory_read",
        "agent_call",
      ] as const;
      for (const type of newNodeTypes) {
        const node = {
          id: `node-${type}`,
          type,
          position: { x: 0, y: 0 },
          data: {},
        };
        const parsed = AgentCanvasNodeSchema.parse(node);
        expect(parsed.type).toBe(type);
      }
    });

    it("rejects node without required fields", () => {
      const node = { id: "node-1" };
      expect(() => AgentCanvasNodeSchema.parse(node)).toThrow();
    });
  });

  describe("AgentCanvasEdgeSchema", () => {
    it("parses valid edge", () => {
      const edge = { id: "edge-1", source: "node-1", target: "node-2" };
      const parsed = AgentCanvasEdgeSchema.parse(edge);
      expect(parsed.type).toBeUndefined();
    });

    it("accepts all edge types", () => {
      const types: EdgeType[] = ["data", "control", "conditional"];
      for (const type of types) {
        const edge = { id: "e1", source: "n1", target: "n2", type };
        expect(AgentCanvasEdgeSchema.parse(edge).type).toBe(type);
      }
    });
  });

  describe("ExecutionStatusSchema", () => {
    it("accepts all valid statuses", () => {
      const statuses: ExecutionStatus[] = [
        "PENDING",
        "RUNNING",
        "WAITING_APPROVAL",
        "WAITING_INPUT",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "TIMED_OUT",
      ];
      for (const status of statuses) {
        expect(ExecutionStatusSchema.parse(status)).toBe(status);
      }
    });

    it("rejects invalid status", () => {
      expect(() => ExecutionStatusSchema.parse("unknown")).toThrow();
    });
  });

  describe("CompiledAgentConfigSchema", () => {
    it("parses simple config", () => {
      const config = {
        name: "simple-agent",
        pattern: "llm" as const,
        tools: ["search"],
      };
      const parsed = CompiledAgentConfigSchema.parse(config);
      expect(parsed.name).toBe("simple-agent");
      expect(parsed.tools).toEqual(["search"]);
    });

    it("parses nested subAgents", () => {
      const config = {
        name: "coordinator",
        pattern: "coordinator" as const,
        tools: [],
        subAgents: [
          { name: "worker-1", pattern: "llm" as const, tools: ["search"] },
          { name: "worker-2", pattern: "llm" as const, tools: ["doc_get"] },
        ],
      };
      const parsed = CompiledAgentConfigSchema.parse(config);
      expect(parsed.subAgents).toHaveLength(2);
    });

    it("accepts all pattern types", () => {
      const patterns: CompiledAgentConfig["pattern"][] = [
        "llm",
        "sequential",
        "parallel",
        "coordinator",
        "loop",
        "generator-critic",
        "hierarchical",
      ];
      for (const pattern of patterns) {
        const config = { name: "test", pattern, tools: [] as string[] };
        expect(CompiledAgentConfigSchema.parse(config).pattern).toBe(pattern);
      }
    });
  });

  describe("Control Node Configs", () => {
    describe("RetryNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = RetryNodeConfigSchema.parse({});
        expect(parsed.maxAttempts).toBe(3);
        expect(parsed.backoffMs).toBe(1000);
        expect(parsed.exponential).toBe(true);
      });

      it("validates maxAttempts range", () => {
        expect(() => RetryNodeConfigSchema.parse({ maxAttempts: 0 })).toThrow();
        expect(() =>
          RetryNodeConfigSchema.parse({ maxAttempts: 11 })
        ).toThrow();
        expect(
          RetryNodeConfigSchema.parse({ maxAttempts: 5 }).maxAttempts
        ).toBe(5);
      });

      it("accepts optional fields", () => {
        const parsed = RetryNodeConfigSchema.parse({
          retryOnErrors: ["TIMEOUT", "RATE_LIMITED"],
          jitterMs: 100,
        });
        expect(parsed.retryOnErrors).toEqual(["TIMEOUT", "RATE_LIMITED"]);
        expect(parsed.jitterMs).toBe(100);
      });
    });

    describe("TryCatchNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = TryCatchNodeConfigSchema.parse({});
        expect(parsed.rethrowUnhandled).toBe(true);
        expect(parsed.logErrors).toBe(true);
      });

      it("accepts error patterns", () => {
        const parsed = TryCatchNodeConfigSchema.parse({
          catchErrors: ["ValidationError", "NetworkError"],
          fallbackValue: { status: "fallback" },
        });
        expect(parsed.catchErrors).toHaveLength(2);
        expect(parsed.fallbackValue).toEqual({ status: "fallback" });
      });
    });
  });

  describe("AI Node Configs", () => {
    describe("EmbeddingsNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = EmbeddingsNodeConfigSchema.parse({});
        expect(parsed.model).toBe("text-embedding-3-small");
        expect(parsed.batchSize).toBe(100);
        expect(parsed.normalize).toBe(true);
      });

      it("accepts custom dimensions", () => {
        const parsed = EmbeddingsNodeConfigSchema.parse({ dimensions: 768 });
        expect(parsed.dimensions).toBe(768);
      });
    });

    describe("RerankNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = RerankNodeConfigSchema.parse({});
        expect(parsed.model).toBe("cohere-rerank-v3");
        expect(parsed.topK).toBe(10);
        expect(parsed.returnScores).toBe(true);
      });

      it("validates threshold range", () => {
        expect(() =>
          RerankNodeConfigSchema.parse({ threshold: 1.5 })
        ).toThrow();
        expect(RerankNodeConfigSchema.parse({ threshold: 0.8 }).threshold).toBe(
          0.8
        );
      });
    });

    describe("ChunkNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = ChunkNodeConfigSchema.parse({});
        expect(parsed.strategy).toBe("semantic");
        expect(parsed.maxChunkSize).toBe(512);
        expect(parsed.overlap).toBe(50);
      });

      it("accepts all strategies", () => {
        const strategies = [
          "fixed",
          "semantic",
          "sentence",
          "paragraph",
        ] as const;
        for (const strategy of strategies) {
          expect(ChunkNodeConfigSchema.parse({ strategy }).strategy).toBe(
            strategy
          );
        }
      });
    });

    describe("MergeNodeConfigSchema", () => {
      it("parses with defaults", () => {
        const parsed = MergeNodeConfigSchema.parse({});
        expect(parsed.strategy).toBe("concatenate");
        expect(parsed.separator).toBe("\n\n");
        expect(parsed.dedupeThreshold).toBe(0.95);
      });
    });
  });

  describe("Integration Node Configs", () => {
    describe("HttpRequestNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = HttpRequestNodeConfigSchema.parse({
          url: "https://api.example.com",
        });
        expect(parsed.method).toBe("GET");
        expect(parsed.timeoutMs).toBe(30_000);
        expect(parsed.retry.enabled).toBe(true);
        expect(parsed.response.responseType).toBe("auto");
      });

      it("accepts all HTTP methods", () => {
        const methods = [
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "HEAD",
          "OPTIONS",
        ] as const;
        for (const method of methods) {
          expect(
            HttpRequestNodeConfigSchema.parse({
              url: "https://api.example.com",
              method,
            }).method
          ).toBe(method);
        }
      });

      it("accepts headers and query params", () => {
        const parsed = HttpRequestNodeConfigSchema.parse({
          url: "https://api.example.com",
          headers: [{ key: "Authorization", value: "Bearer token" }],
          queryParams: [{ key: "page", value: "1" }],
        });
        expect(parsed.headers).toHaveLength(1);
        expect(parsed.headers.at(0)?.key).toBe("Authorization");
        expect(parsed.queryParams).toHaveLength(1);
        expect(parsed.queryParams.at(0)?.value).toBe("1");
      });
    });

    describe("DatabaseQueryNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = DatabaseQueryNodeConfigSchema.parse({
          connectionId: "conn_123",
          query: "SELECT * FROM users",
        });
        expect(parsed.timeout).toBe(30_000);
        expect(parsed.readOnly).toBe(true);
        expect(parsed.maxRows).toBe(1000);
      });

      it("accepts parameters", () => {
        const parsed = DatabaseQueryNodeConfigSchema.parse({
          connectionId: "conn_123",
          query: "SELECT * FROM users WHERE id = $1",
          parameters: [{ name: "id", value: "user_123", type: "string" }],
        });
        expect(parsed.parameters).toHaveLength(1);
        expect(parsed.parameters.at(0)?.name).toBe("id");
        expect(parsed.parameters.at(0)?.value).toBe("user_123");
      });
    });

    describe("GraphqlQueryNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = GraphqlQueryNodeConfigSchema.parse({
          endpoint: "https://api.example.com/graphql",
          query: "query { users { id name } }",
        });
        expect(parsed.timeoutMs).toBe(30_000);
      });

      it("accepts variables and operation name", () => {
        const parsed = GraphqlQueryNodeConfigSchema.parse({
          endpoint: "https://api.example.com/graphql",
          query: "query GetUser($id: ID!) { user(id: $id) { name } }",
          variables: '{"id":"123"}',
          operationName: "GetUser",
        });
        expect(parsed.variables).toBe('{"id":"123"}');
        expect(parsed.operationName).toBe("GetUser");
      });
    });
  });

  describe("Trigger Node Configs", () => {
    describe("TriggerManualNodeConfigSchema", () => {
      it("parses empty config", () => {
        const parsed = TriggerManualNodeConfigSchema.parse({});
        expect(parsed.inputSchema).toBeUndefined();
      });

      it("accepts input schema", () => {
        const parsed = TriggerManualNodeConfigSchema.parse({
          inputSchema: [
            { name: "query", type: "string", required: true },
            { name: "limit", type: "number", required: false },
          ],
        });
        expect(parsed.inputSchema).toHaveLength(2);
      });
    });

    describe("TriggerScheduleNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = TriggerScheduleNodeConfigSchema.parse({
          cron: "0 * * * *",
        });
        expect(parsed.timezone).toBe("UTC");
        expect(parsed.enabled).toBe(true);
        expect(parsed.runOnStart).toBe(false);
        expect(parsed.catchUpMissed).toBe(false);
      });

      it("accepts full config", () => {
        const parsed = TriggerScheduleNodeConfigSchema.parse({
          cron: "0 9 * * 1-5",
          timezone: "America/New_York",
          startDate: "2024-01-01",
          maxRuns: 100,
        });
        expect(parsed.timezone).toBe("America/New_York");
        expect(parsed.maxRuns).toBe(100);
      });
    });

    describe("TriggerWebhookNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = TriggerWebhookNodeConfigSchema.parse({
          path: "/webhooks/my-workflow",
        });
        expect(parsed.method).toBe("POST");
        expect(parsed.authentication).toBe("none");
      });

      it("accepts security config", () => {
        const parsed = TriggerWebhookNodeConfigSchema.parse({
          path: "/webhooks/secure",
          authentication: "hmac",
          secret: "my-secret",
          signatureHeader: "X-Signature",
          allowedIps: ["192.168.1.1"],
        });
        expect(parsed.authentication).toBe("hmac");
        expect(parsed.allowedIps).toHaveLength(1);
      });
    });

    describe("TriggerEventNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = TriggerEventNodeConfigSchema.parse({
          eventType: "document.created",
        });
        expect(parsed.eventSource).toBe("system");
      });

      it("accepts connector event config", () => {
        const parsed = TriggerEventNodeConfigSchema.parse({
          eventType: "sync.completed",
          eventSource: "connector",
          connectorType: "slack",
          filter: { channel: "general" },
        });
        expect(parsed.eventSource).toBe("connector");
        expect(parsed.connectorType).toBe("slack");
      });
    });
  });

  describe("Memory Node Configs", () => {
    describe("MemoryReadNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = MemoryReadNodeConfigSchema.parse({
          key: "user-preferences",
        });
        expect(parsed.scope).toBe("workflow");
      });

      it("accepts all scopes", () => {
        const scopes = ["workflow", "user", "team", "global"] as const;
        for (const scope of scopes) {
          expect(
            MemoryReadNodeConfigSchema.parse({ key: "test", scope }).scope
          ).toBe(scope);
        }
      });
    });

    describe("MemoryWriteNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = MemoryWriteNodeConfigSchema.parse({
          key: "session-data",
        });
        expect(parsed.overwrite).toBe(true);
      });

      it("accepts TTL", () => {
        const parsed = MemoryWriteNodeConfigSchema.parse({
          key: "cache",
          ttlMs: 3_600_000,
        });
        expect(parsed.ttlMs).toBe(3_600_000);
      });
    });

    describe("MemorySearchNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = MemorySearchNodeConfigSchema.parse({
          query: "recent conversations",
        });
        expect(parsed.topK).toBe(10);
        expect(parsed.includeMetadata).toBe(true);
      });

      it("accepts threshold", () => {
        const parsed = MemorySearchNodeConfigSchema.parse({
          query: "search",
          threshold: 0.7,
        });
        expect(parsed.threshold).toBe(0.7);
      });
    });
  });

  describe("Orchestration Node Configs", () => {
    describe("SubWorkflowNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = SubWorkflowNodeConfigSchema.parse({
          workflowId: "workflow_123",
        });
        expect(parsed.waitForCompletion).toBe(true);
        expect(parsed.inheritContext).toBe(true);
      });

      it("accepts mappings", () => {
        const parsed = SubWorkflowNodeConfigSchema.parse({
          workflowId: "workflow_123",
          inputMappings: { query: "$.input.searchQuery" },
          outputMappings: { result: "subWorkflowResult" },
        });
        expect(parsed.inputMappings).toEqual({ query: "$.input.searchQuery" });
      });
    });

    describe("AgentCallNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = AgentCallNodeConfigSchema.parse({
          agentId: "agent_123",
          prompt: "Analyze this document",
        });
        expect(parsed.maxSteps).toBe(10);
        expect(parsed.temperature).toBe(0.7);
      });

      it("accepts tool restrictions", () => {
        const parsed = AgentCallNodeConfigSchema.parse({
          agentId: "agent_123",
          prompt: "Search only",
          tools: ["search_hybrid", "doc_get"],
        });
        expect(parsed.tools).toHaveLength(2);
      });
    });

    describe("ParallelMapNodeConfigSchema", () => {
      it("parses minimal config", () => {
        const parsed = ParallelMapNodeConfigSchema.parse({
          collection: "$.items",
        });
        expect(parsed.maxConcurrency).toBe(10);
        expect(parsed.continueOnError).toBe(false);
      });

      it("accepts batch config", () => {
        const parsed = ParallelMapNodeConfigSchema.parse({
          collection: "$.items",
          maxConcurrency: 5,
          batchSize: 10,
          timeout: 60_000,
        });
        expect(parsed.batchSize).toBe(10);
      });
    });
  });

  describe("Connector Action Schemas", () => {
    describe("ConnectorActionCategorySchema", () => {
      it("accepts all categories", () => {
        const categories = [
          "create",
          "read",
          "update",
          "delete",
          "search",
          "list",
          "notify",
          "sync",
          "transform",
          "batch",
        ] as const;
        for (const cat of categories) {
          expect(ConnectorActionCategorySchema.parse(cat)).toBe(cat);
        }
      });
    });

    describe("ConnectorActionDefinitionSchema", () => {
      it("parses full definition", () => {
        const definition = {
          id: "slack_send_message",
          name: "Send Message",
          description: "Send a message to a Slack channel",
          connectorType: "slack",
          resource: "message",
          category: "notify",
          inputs: [
            {
              id: "channel",
              name: "Channel",
              type: "string",
              required: true,
            },
            {
              id: "message",
              name: "Message",
              type: "string",
              required: true,
            },
          ],
          outputs: [
            {
              id: "messageId",
              name: "Message ID",
              type: "string",
            },
          ],
        };
        const parsed = ConnectorActionDefinitionSchema.parse(definition);
        expect(parsed.id).toBe("slack_send_message");
        expect(parsed.stakes).toBe("medium");
        expect(parsed.reversible).toBe(false);
      });
    });

    describe("ConnectorActionNodeConfigSchema", () => {
      it("parses config", () => {
        const config = {
          connectorType: "slack",
          actionId: "send_message",
          inputMappings: {
            channel: "#general",
            message: "$.input.text",
          },
        };
        const parsed = ConnectorActionNodeConfigSchema.parse(config);
        expect(parsed.continueOnError).toBe(false);
      });
    });

    describe("ConnectorActionExecuteParamsSchema", () => {
      it("parses execution params", () => {
        const params = {
          connectorId: "conn_123",
          actionId: "send_message",
          inputs: { channel: "#general", message: "Hello" },
          context: {
            teamId: "team_123",
            userId: "user_123",
            runId: "run_123",
            nodeId: "node_123",
          },
        };
        const parsed = ConnectorActionExecuteParamsSchema.parse(params);
        expect(parsed.connectorId).toBe("conn_123");
        expect(parsed.context.teamId).toBe("team_123");
      });
    });

    describe("ConnectorActionExecuteResultSchema", () => {
      it("parses success result", () => {
        const result = {
          success: true,
          data: { messageId: "msg_123" },
          metrics: { durationMs: 150 },
        };
        const parsed = ConnectorActionExecuteResultSchema.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toEqual({ messageId: "msg_123" });
      });

      it("parses error result", () => {
        const result = {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
            retryable: true,
          },
          metrics: { durationMs: 50, retryCount: 3 },
        };
        const parsed = ConnectorActionExecuteResultSchema.parse(result);
        expect(parsed.success).toBe(false);
        expect(parsed.error?.retryable).toBe(true);
      });
    });
  });

  describe("Trigger Schemas", () => {
    describe("TriggerConfigSchema (discriminated union)", () => {
      it("parses manual trigger", () => {
        const config = { type: "manual" as const };
        const parsed = TriggerConfigSchema.parse(config);
        expect(parsed.type).toBe("manual");
      });

      it("parses schedule trigger", () => {
        const config = {
          type: "schedule" as const,
          cron: "0 * * * *",
        };
        const parsed = TriggerConfigSchema.parse(config);
        expect(parsed.type).toBe("schedule");
      });

      it("parses webhook trigger", () => {
        const config = {
          type: "webhook" as const,
          path: "/hooks/test",
        };
        const parsed = TriggerConfigSchema.parse(config);
        expect(parsed.type).toBe("webhook");
      });

      it("parses event trigger", () => {
        const config = {
          type: "event" as const,
          eventType: "document.created",
        };
        const parsed = TriggerConfigSchema.parse(config);
        expect(parsed.type).toBe("event");
      });
    });

    describe("TriggerNodeDataSchema", () => {
      it("parses full node data", () => {
        const data = {
          label: "Daily Report Trigger",
          description: "Triggers at 9 AM every weekday",
          config: {
            type: "schedule" as const,
            cron: "0 9 * * 1-5",
          },
          enabled: true,
          triggerCount: 42,
        };
        const parsed = TriggerNodeDataSchema.parse(data);
        expect(parsed.label).toBe("Daily Report Trigger");
        expect(parsed.triggerCount).toBe(42);
      });
    });

    describe("TriggerExecutionContextSchema", () => {
      it("parses execution context", () => {
        const context = {
          triggerId: "trigger_123",
          triggerType: "webhook" as const,
          workflowId: "workflow_123",
          timestamp: Date.now(),
          payload: { data: "test" },
          metadata: {
            source: "external",
            correlationId: "corr_123",
            headers: { "X-Request-ID": "req_123" },
          },
        };
        const parsed = TriggerExecutionContextSchema.parse(context);
        expect(parsed.triggerId).toBe("trigger_123");
        expect(parsed.metadata.correlationId).toBe("corr_123");
      });
    });

    describe("ScheduleNextRunSchema", () => {
      it("parses schedule next run", () => {
        const nextRun = {
          scheduledAt: new Date("2024-01-15T09:00:00Z"),
          cron: "0 9 * * *",
          timezone: "UTC",
        };
        const parsed = ScheduleNextRunSchema.parse(nextRun);
        expect(parsed.cron).toBe("0 9 * * *");
      });
    });

    describe("WebhookRegistrationSchema", () => {
      it("parses registration", () => {
        const registration = {
          id: "wh_123",
          path: "/webhooks/test",
          method: "POST",
          workflowId: "workflow_123",
          createdAt: new Date(),
        };
        const parsed = WebhookRegistrationSchema.parse(registration);
        expect(parsed.id).toBe("wh_123");
      });
    });

    describe("EventSubscriptionSchema", () => {
      it("parses subscription", () => {
        const subscription = {
          id: "sub_123",
          eventType: "document.created",
          eventSource: "connector" as const,
          workflowId: "workflow_123",
          filter: { connectorType: "slack" },
          createdAt: new Date(),
          active: true,
        };
        const parsed = EventSubscriptionSchema.parse(subscription);
        expect(parsed.active).toBe(true);
      });
    });
  });
});

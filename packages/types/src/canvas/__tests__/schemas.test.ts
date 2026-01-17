import { describe, expect, it } from "bun:test";
import {
  type CompiledAgentConfig,
  CompiledAgentConfigSchema,
} from "../compiler";
import { AgentCanvasEdgeSchema, type EdgeType } from "../edges";
import { type ExecutionStatus, ExecutionStatusSchema } from "../execution";
import {
  AgentCanvasNodeSchema,
  type NodeCategory,
  NodeCategorySchema,
} from "../nodes";

describe("canvas type schemas", () => {
  describe("NodeCategorySchema", () => {
    it("accepts valid categories", () => {
      const categories: NodeCategory[] = [
        "control",
        "ai",
        "transform",
        "integration",
        "human",
      ];
      for (const cat of categories) {
        expect(NodeCategorySchema.parse(cat)).toBe(cat);
      }
    });

    it("rejects invalid categories", () => {
      expect(() => NodeCategorySchema.parse("invalid")).toThrow();
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

    it("rejects node without required fields", () => {
      const node = { id: "node-1" };
      expect(() => AgentCanvasNodeSchema.parse(node)).toThrow();
    });
  });

  describe("AgentCanvasEdgeSchema", () => {
    it("parses valid edge with defaults", () => {
      const edge = { id: "edge-1", source: "node-1", target: "node-2" };
      const parsed = AgentCanvasEdgeSchema.parse(edge);
      expect(parsed.type).toBe("data");
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
        "pending",
        "running",
        "waiting_approval",
        "waiting_input",
        "completed",
        "failed",
        "cancelled",
        "timed_out",
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
});

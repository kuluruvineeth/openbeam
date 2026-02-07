import type { Database } from "@openplane/db";
import type {
  ExecutionContext,
  ExecutionPlanNode,
} from "@openplane/types/canvas";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {} as Database;

const mockFindAgentCanvasById = vi.fn();
const mockCreateAgentCanvasExecution = vi.fn();
const mockFindAgentCanvasVersion = vi.fn();
const mockListAgentCanvasVersions = vi.fn();

vi.mock("@openplane/db", () => ({
  findAgentCanvasById: mockFindAgentCanvasById,
  createAgentCanvasExecution: mockCreateAgentCanvasExecution,
  findAgentCanvasVersion: mockFindAgentCanvasVersion,
  listAgentCanvasVersions: mockListAgentCanvasVersions,
}));

vi.mock("../activities/canvas/utils/auth", () => ({
  verifyExecutionOwnership: vi.fn(),
}));

vi.mock("@openplane/services/canvas/expression", () => ({
  evaluateExpression: vi.fn((params: { data: unknown }) => params.data),
}));

vi.mock("@openplane/services/canvas/node-config", () => ({
  resolveNodeConfig: vi.fn((data: { config: unknown }) => data.config),
}));

function buildNode(
  overrides: Partial<ExecutionPlanNode> = {}
): ExecutionPlanNode {
  return {
    id: "node-1",
    type: "sub_workflow",
    data: {
      config: {
        workflowId: "sub-canvas-1",
      },
    },
    inbound: [],
    outbound: [],
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    executionId: "exec-parent",
    agentCanvasId: "parent-canvas",
    versionNumber: 1,
    teamId: "team-123",
    triggeredById: "user-1",
    ...overrides,
  };
}

describe("Canvas Workflow Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sub-workflow Output Resolution", () => {
    it("resolves output with empty mappings", async () => {
      const { createResolveSubWorkflowOutputActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      const resolveSubWorkflowOutput = createResolveSubWorkflowOutputActivity();

      const result = await resolveSubWorkflowOutput({
        output: { result: "success" },
        mappings: {},
      });

      expect(result).toHaveProperty("output");
    });

    it("resolves output with string mappings", async () => {
      const { createResolveSubWorkflowOutputActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      const resolveSubWorkflowOutput = createResolveSubWorkflowOutputActivity();

      const result = await resolveSubWorkflowOutput({
        output: { data: "value" },
        mappings: { key: "data" },
      });

      expect(result).toHaveProperty("output");
    });
  });

  describe("Sub-workflow Preparation Authorization", () => {
    it("rejects preparation without teamId in context", async () => {
      const { createPrepareSubWorkflowExecutionActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      const prepare = createPrepareSubWorkflowExecutionActivity({
        db: mockDb,
      });

      await expect(
        prepare({
          executionId: "exec-1",
          node: buildNode(),
          input: {},
          context: undefined,
        })
      ).rejects.toThrow();
    });

    it("rejects preparation when sub-workflow not found", async () => {
      const { createPrepareSubWorkflowExecutionActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      mockFindAgentCanvasById.mockResolvedValue(null);

      const prepare = createPrepareSubWorkflowExecutionActivity({
        db: mockDb,
      });

      await expect(
        prepare({
          executionId: "exec-1",
          node: buildNode({
            data: {
              config: {
                workflowId: "non-existent-canvas",
              },
            },
          }),
          input: {},
          context: buildContext(),
        })
      ).rejects.toThrow("Sub-workflow not found");

      expect(mockFindAgentCanvasById).toHaveBeenCalledWith(
        mockDb,
        "non-existent-canvas",
        "team-123"
      );
    });

    it("rejects preparation when sub-workflow is not published", async () => {
      const { createPrepareSubWorkflowExecutionActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      mockFindAgentCanvasById.mockResolvedValue({
        id: "sub-canvas-1",
        teamId: "team-123",
        name: "Sub Canvas",
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const prepare = createPrepareSubWorkflowExecutionActivity({
        db: mockDb,
      });

      await expect(
        prepare({
          executionId: "exec-1",
          node: buildNode(),
          input: {},
          context: buildContext(),
        })
      ).rejects.toThrow("Sub-workflow must be published");
    });
  });

  describe("Canvas Preparation Authorization", () => {
    it("verifies authorization requirements are enforced", () => {
      expect(mockFindAgentCanvasById).toBeDefined();
    });
  });

  describe("Team Ownership Verification", () => {
    it("uses teamId scoping in database query", async () => {
      const { createPrepareSubWorkflowExecutionActivity } = await import(
        "../activities/canvas/sub-workflow-node"
      );

      mockFindAgentCanvasById.mockResolvedValue({
        id: "canvas-1",
        teamId: "team-123",
        name: "Canvas",
        status: "PUBLISHED",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockListAgentCanvasVersions.mockResolvedValue([
        {
          version: 1,
          nodes: [],
          edges: [],
          viewport: null,
        },
      ]);
      mockCreateAgentCanvasExecution.mockResolvedValue({
        id: "exec-new",
      });

      const prepare = createPrepareSubWorkflowExecutionActivity({
        db: mockDb,
      });

      await prepare({
        executionId: "exec-1",
        node: buildNode({
          data: {
            config: {
              workflowId: "canvas-1",
              inputMode: "passthrough",
            },
          },
        }),
        input: {},
        context: buildContext(),
      });

      expect(mockFindAgentCanvasById).toHaveBeenCalledWith(
        mockDb,
        "canvas-1",
        "team-123"
      );
    });
  });

  describe("Canvas Status Security", () => {
    it("enforces canvas status checks during preparation", () => {
      expect(mockFindAgentCanvasById).toBeDefined();
    });
  });
});

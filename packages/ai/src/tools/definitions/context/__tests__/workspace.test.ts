import { describe, expect, it, mock } from "bun:test";
import type { ToolServices, VirtualFileInfo } from "../../../services";
import type { ToolContext } from "../../../types";
import { workspaceDeleteTool, workspaceWriteTool } from "../workspace";

function createMockServices(
  overrides: Partial<ToolServices["context"]> = {}
): ToolServices {
  return {
    context: {
      storeVirtualFile: mock(() => ({
        fileId: "vf_default",
        name: "default",
        preview: "default...",
        tokenCount: 10,
      })),
      retrieveVirtualFile: mock(() => null),
      retrieveVirtualFileChunk: mock(() => null),
      listVirtualFiles: mock(() => []),
      deleteVirtualFile: mock(() => true),
      ...overrides,
    },
    search: {} as ToolServices["search"],
    rag: {} as ToolServices["rag"],
    documents: {} as ToolServices["documents"],
    connectors: {} as ToolServices["connectors"],
    analytics: {} as ToolServices["analytics"],
  };
}

function createTestContext(services: ToolServices): ToolContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    sessionId: "session_test",
    services,
  };
}

describe("workspaceWriteTool", () => {
  describe("successful write", () => {
    it("stores content and returns file info", async () => {
      const mockFileInfo: VirtualFileInfo = {
        fileId: "vf_1_1234567890",
        name: "test-file",
        preview: "Test content...",
        tokenCount: 100,
      };
      const services = createMockServices({
        storeVirtualFile: mock(() => mockFileInfo),
      });
      const ctx = createTestContext(services);

      const result = await workspaceWriteTool.execute(
        { name: "test-file", content: "Test content for storage" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.fileId).toBe("vf_1_1234567890");
      expect(result.data?.name).toBe("test-file");
      expect(result.data?.tokenCount).toBe(100);
      expect(services.context.storeVirtualFile).toHaveBeenCalledWith(
        "test-file",
        "Test content for storage",
        undefined
      );
    });

    it("passes mimeType when provided", async () => {
      const mockFileInfo: VirtualFileInfo = {
        fileId: "vf_2_1234567890",
        name: "data.json",
        preview: '{"key": "value"...',
        tokenCount: 50,
      };
      const services = createMockServices({
        storeVirtualFile: mock(() => mockFileInfo),
      });
      const ctx = createTestContext(services);

      const result = await workspaceWriteTool.execute(
        {
          name: "data.json",
          content: '{"key": "value"}',
          mimeType: "application/json",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(services.context.storeVirtualFile).toHaveBeenCalledWith(
        "data.json",
        '{"key": "value"}',
        "application/json"
      );
    });
  });

  describe("validation", () => {
    it("returns error for empty content", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await workspaceWriteTool.execute(
        { name: "empty-file", content: "" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
      expect(result.error?.message).toContain("empty");
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata", async () => {
      const mockFileInfo: VirtualFileInfo = {
        fileId: "vf_3_1234567890",
        name: "test",
        preview: "test...",
        tokenCount: 10,
      };
      const services = createMockServices({
        storeVirtualFile: mock(() => mockFileInfo),
      });
      const ctx = createTestContext(services);

      const result = await workspaceWriteTool.execute(
        { name: "test", content: "test content" },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(typeof result.metadata?.latencyMs).toBe("number");
    });
  });
});

describe("workspaceDeleteTool", () => {
  describe("successful delete", () => {
    it("deletes existing file", async () => {
      const services = createMockServices({
        deleteVirtualFile: mock(() => true),
      });
      const ctx = createTestContext(services);

      const result = await workspaceDeleteTool.execute(
        { fileId: "vf_1_1234567890" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.fileId).toBe("vf_1_1234567890");
      expect(result.data?.deleted).toBe(true);
      expect(services.context.deleteVirtualFile).toHaveBeenCalledWith(
        "vf_1_1234567890"
      );
    });
  });

  describe("file not found", () => {
    it("returns error for non-existent file", async () => {
      const services = createMockServices({
        deleteVirtualFile: mock(() => false),
      });
      const ctx = createTestContext(services);

      const result = await workspaceDeleteTool.execute(
        { fileId: "vf_nonexistent" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).toContain("vf_nonexistent");
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata on success", async () => {
      const services = createMockServices({
        deleteVirtualFile: mock(() => true),
      });
      const ctx = createTestContext(services);

      const result = await workspaceDeleteTool.execute(
        { fileId: "vf_1_1234567890" },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(typeof result.metadata?.latencyMs).toBe("number");
    });
  });
});

describe("workspace tool metadata", () => {
  it("workspaceWriteTool has correct metadata", () => {
    expect(workspaceWriteTool.metadata.name).toBe("workspace_write");
    expect(workspaceWriteTool.metadata.category).toBe("data");
    expect(workspaceWriteTool.metadata.allowedCallers).toContain("agent");
    expect(workspaceWriteTool.metadata.allowedCallers).toContain("mcp");
  });

  it("workspaceDeleteTool has correct metadata", () => {
    expect(workspaceDeleteTool.metadata.name).toBe("workspace_delete");
    expect(workspaceDeleteTool.metadata.category).toBe("data");
    expect(workspaceDeleteTool.metadata.allowedCallers).toContain("agent");
    expect(workspaceDeleteTool.metadata.allowedCallers).toContain("mcp");
  });
});

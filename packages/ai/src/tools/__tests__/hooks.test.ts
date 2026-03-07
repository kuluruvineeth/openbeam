import { beforeEach, describe, expect, it } from "bun:test";
import type { ToolMetadata } from "@openbeam/types/ai";
import {
  checkWebPermission,
  createAccessControlHook,
  createPermissionModeHook,
  createProvenanceTrackingHook,
  createRateLimitHook,
  createRedactSensitiveDataHook,
  HookRegistry,
  type PreToolHook,
} from "../hooks";
import type { ToolContext, WebPermissionConfig } from "../types";

const SEARCH_OR_DOC_PATTERN = /^(search|doc)_/;

const createMockContext = (overrides?: Partial<ToolContext>): ToolContext => ({
  teamId: "team-1",
  userId: "user-1",
  services: {} as ToolContext["services"],
  ...overrides,
});

const createMockMetadata = (
  overrides?: Partial<ToolMetadata>
): ToolMetadata => ({
  name: "test_tool",
  description: "A test tool",
  category: "search",
  ...overrides,
});

describe("HookRegistry", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe("registerPreHook", () => {
    it("registers a pre-hook", () => {
      const hook: PreToolHook = {
        name: "test-hook",
        priority: 0,
        handler: async () => ({ action: "allow" }),
      };

      registry.registerPreHook(hook);

      expect(registry.getPreHooks()).toHaveLength(1);
    });

    it("sorts hooks by priority", () => {
      const hook1: PreToolHook = {
        name: "low-priority",
        priority: 100,
        handler: async () => ({ action: "allow" }),
      };
      const hook2: PreToolHook = {
        name: "high-priority",
        priority: 0,
        handler: async () => ({ action: "allow" }),
      };

      registry.registerPreHook(hook1);
      registry.registerPreHook(hook2);

      const hooks = registry.getPreHooks();
      expect(hooks[0]?.name).toBe("high-priority");
      expect(hooks[1]?.name).toBe("low-priority");
    });
  });

  describe("unregisterPreHook", () => {
    it("removes hook by name", () => {
      const hook: PreToolHook = {
        name: "removable",
        priority: 0,
        handler: async () => ({ action: "allow" }),
      };

      registry.registerPreHook(hook);
      const removed = registry.unregisterPreHook("removable");

      expect(removed).toBe(true);
      expect(registry.getPreHooks()).toHaveLength(0);
    });

    it("returns false for non-existent hook", () => {
      const removed = registry.unregisterPreHook("nonexistent");

      expect(removed).toBe(false);
    });
  });

  describe("runPreHooks", () => {
    it("runs hooks in priority order", async () => {
      const order: string[] = [];

      registry.registerPreHook({
        name: "second",
        priority: 10,
        handler: () => {
          order.push("second");
          return Promise.resolve({ action: "allow" as const });
        },
      });

      registry.registerPreHook({
        name: "first",
        priority: 0,
        handler: () => {
          order.push("first");
          return Promise.resolve({ action: "allow" as const });
        },
      });

      await registry.runPreHooks({
        toolName: "test",
        toolMetadata: createMockMetadata(),
        params: {},
        context: createMockContext(),
      });

      expect(order).toEqual(["first", "second"]);
    });

    it("stops on deny action", async () => {
      let secondCalled = false;

      registry.registerPreHook({
        name: "denier",
        priority: 0,
        handler: async () => ({ action: "deny", reason: "Denied" }),
      });

      registry.registerPreHook({
        name: "second",
        priority: 10,
        handler: () => {
          secondCalled = true;
          return Promise.resolve({ action: "allow" as const });
        },
      });

      const result = await registry.runPreHooks({
        toolName: "test",
        toolMetadata: createMockMetadata(),
        params: {},
        context: createMockContext(),
      });

      expect(result.action).toBe("deny");
      expect(secondCalled).toBe(false);
    });

    it("matches wildcard patterns", async () => {
      let hookCalled = false;

      registry.registerPreHook({
        name: "search-only",
        priority: 0,
        toolPattern: "search_*",
        handler: () => {
          hookCalled = true;
          return Promise.resolve({ action: "allow" as const });
        },
      });

      await registry.runPreHooks({
        toolName: "search_hybrid",
        toolMetadata: createMockMetadata(),
        params: {},
        context: createMockContext(),
      });

      expect(hookCalled).toBe(true);
    });

    it("matches regex patterns", async () => {
      let hookCalled = false;

      registry.registerPreHook({
        name: "regex-hook",
        priority: 0,
        toolPattern: SEARCH_OR_DOC_PATTERN,
        handler: () => {
          hookCalled = true;
          return Promise.resolve({ action: "allow" as const });
        },
      });

      await registry.runPreHooks({
        toolName: "doc_get",
        toolMetadata: createMockMetadata(),
        params: {},
        context: createMockContext(),
      });

      expect(hookCalled).toBe(true);
    });
  });

  describe("runPostHooks", () => {
    it("modifies result through hooks", async () => {
      registry.registerPostHook({
        name: "modifier",
        priority: 0,
        handler: async (ctx) => ({
          ...ctx.result,
          data: { ...(ctx.result.data as object), modified: true },
        }),
      });

      const result = await registry.runPostHooks({
        toolName: "test",
        toolMetadata: createMockMetadata(),
        params: {},
        context: createMockContext(),
        result: { success: true, data: { value: 1 } },
        durationMs: 100,
      });

      expect((result as { data: { modified: boolean } })?.data?.modified).toBe(
        true
      );
    });
  });
});

describe("createAccessControlHook", () => {
  it("allows when no permissions required", async () => {
    const hook = createAccessControlHook(async () => true);

    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata({ requiredPermissions: [] }),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("allow");
  });

  it("denies when permission check fails", async () => {
    const hook = createAccessControlHook(async () => false);

    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata({
        requiredPermissions: ["admin:write"],
      }),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("deny");
  });
});

describe("createRateLimitHook", () => {
  it("allows when under limit", async () => {
    const hook = createRateLimitHook(
      { maxCallsPerMinute: 60, maxCallsPerHour: 1000 },
      async () => ({ allowed: true })
    );

    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("allow");
  });

  it("denies when rate limited", async () => {
    const hook = createRateLimitHook(
      { maxCallsPerMinute: 60, maxCallsPerHour: 1000 },
      async () => ({ allowed: false, retryAfterMs: 5000 })
    );

    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("deny");
  });
});

describe("createRedactSensitiveDataHook", () => {
  const hook = createRedactSensitiveDataHook();

  it("redacts password fields", async () => {
    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
      result: {
        success: true,
        data: { username: "john", password: "secret123" },
      },
      durationMs: 100,
    });

    expect((result?.data as { password: string })?.password).toBe("[REDACTED]");
  });

  it("does not modify failed results", async () => {
    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
      result: {
        success: false,
        error: { code: "NOT_FOUND", message: "Not found", retryable: false },
      },
      durationMs: 100,
    });

    expect(result).toBeUndefined();
  });
});

describe("createProvenanceTrackingHook", () => {
  const hook = createProvenanceTrackingHook();

  it("adds provenance to successful results", async () => {
    const result = await hook.handler({
      toolName: "search_semantic",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext({ teamId: "team-abc", userId: "user-xyz" }),
      result: {
        success: true,
        data: { results: [] },
      },
      durationMs: 150,
    });

    const data = result?.data as { _provenance: { toolName: string } };
    expect(data).toHaveProperty("_provenance");
    expect(data._provenance.toolName).toBe("search_semantic");
  });

  it("does not modify failed results", async () => {
    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
      result: {
        success: false,
        error: { code: "TIMEOUT", message: "Timeout", retryable: true },
      },
      durationMs: 100,
    });

    expect(result).toBeUndefined();
  });
});

describe("checkWebPermission", () => {
  const createPermissionConfig = (
    mode: WebPermissionConfig["mode"],
    overrides?: Partial<WebPermissionConfig>
  ): WebPermissionConfig => ({
    mode,
    userId: "user-1",
    teamId: "team-1",
    ...overrides,
  });

  it("allows search tools in default mode", () => {
    const result = checkWebPermission(
      "search_hybrid",
      createMockMetadata({ category: "search" }),
      createPermissionConfig("default")
    );

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBeUndefined();
  });

  it("denies action tools in default mode", () => {
    const result = checkWebPermission(
      "syncConnector",
      createMockMetadata({ category: "action" }),
      createPermissionConfig("default")
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("action");
  });

  it("denies sync in readOnly mode", () => {
    const result = checkWebPermission(
      "syncConnector",
      createMockMetadata({ category: "connectors" }),
      createPermissionConfig("readOnly")
    );

    expect(result.allowed).toBe(false);
  });

  it("allows all categories in elevated mode", () => {
    const result = checkWebPermission(
      "executeAction",
      createMockMetadata({ category: "action" }),
      createPermissionConfig("elevated")
    );

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it("respects custom denied tools", () => {
    const result = checkWebPermission(
      "search_hybrid",
      createMockMetadata({ category: "search" }),
      createPermissionConfig("default", {
        customDeniedTools: ["search_hybrid"],
      })
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("explicitly denied");
  });

  it("respects custom allowed tools", () => {
    const result = checkWebPermission(
      "specialTool",
      createMockMetadata({ category: "action" }),
      createPermissionConfig("default", {
        customAllowedTools: ["specialTool"],
      })
    );

    expect(result.allowed).toBe(true);
  });

  it("denies browser tools in plan mode", () => {
    const result = checkWebPermission(
      "browsePage",
      createMockMetadata({ category: "browser" }),
      createPermissionConfig("plan")
    );

    expect(result.allowed).toBe(false);
  });
});

describe("createPermissionModeHook", () => {
  it("allows when no permission config", async () => {
    const hook = createPermissionModeHook(
      (): WebPermissionConfig | undefined => {
        return;
      }
    );

    const result = await hook.handler({
      toolName: "test",
      toolMetadata: createMockMetadata(),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("allow");
  });

  it("denies when permission check fails", async () => {
    const hook = createPermissionModeHook(() => ({
      mode: "readOnly",
      userId: "user-1",
      teamId: "team-1",
    }));

    const result = await hook.handler({
      toolName: "syncConnector",
      toolMetadata: createMockMetadata({ category: "action" }),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("deny");
  });

  it("requests approval for elevated mode", async () => {
    let approvalRequested = false;
    const hook = createPermissionModeHook(() => ({
      mode: "elevated",
      userId: "user-1",
      teamId: "team-1",
      approvalCallback: () => {
        approvalRequested = true;
        return Promise.resolve(true);
      },
    }));

    const result = await hook.handler({
      toolName: "executeAction",
      toolMetadata: createMockMetadata({ category: "action" }),
      params: {},
      context: createMockContext(),
    });

    expect(approvalRequested).toBe(true);
    expect(result.action).toBe("allow");
  });

  it("denies when approval rejected", async () => {
    const hook = createPermissionModeHook(() => ({
      mode: "elevated",
      userId: "user-1",
      teamId: "team-1",
      approvalCallback: () => Promise.resolve(false),
    }));

    const result = await hook.handler({
      toolName: "executeAction",
      toolMetadata: createMockMetadata({ category: "action" }),
      params: {},
      context: createMockContext(),
    });

    expect(result.action).toBe("deny");
    expect((result as { reason: string }).reason).toContain("not approve");
  });
});

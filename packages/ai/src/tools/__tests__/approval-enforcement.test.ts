import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ToolMetadata } from "@openplane/types/ai";
import { deriveApprovalPattern } from "../builder";
import {
  createApprovalEnforcementHook,
  HookRegistry,
  type PreToolHookContext,
} from "../hooks";
import type { ToolContext } from "../types";

function buildToolMetadata(
  overrides: Partial<ToolMetadata> = {}
): ToolMetadata {
  return {
    name: "test_tool",
    description: "Test tool",
    category: "search",
    ...overrides,
  };
}

function buildToolContext(
  overrides: Record<string, unknown> = {}
): ToolContext {
  return {
    teamId: "team-1",
    userId: "user-1",
    services: {} as ToolContext["services"],
    ...overrides,
  } as ToolContext;
}

function buildHookContext(
  overrides: Partial<PreToolHookContext> = {}
): PreToolHookContext {
  return {
    toolName: "test_tool",
    toolMetadata: buildToolMetadata(),
    params: {},
    context: buildToolContext(),
    ...overrides,
  };
}

describe("deriveApprovalPattern", () => {
  it("returns auto for low stakes + easy reversibility", () => {
    expect(deriveApprovalPattern("low", "easy")).toBe("auto");
  });

  it("returns quick-confirm for low stakes + hard reversibility", () => {
    expect(deriveApprovalPattern("low", "hard")).toBe("quick-confirm");
  });

  it("returns explicit for low stakes + irreversible", () => {
    expect(deriveApprovalPattern("low", "irreversible")).toBe("explicit");
  });

  it("returns quick-confirm for medium stakes + easy", () => {
    expect(deriveApprovalPattern("medium", "easy")).toBe("quick-confirm");
  });

  it("returns suggest-apply for medium stakes + hard", () => {
    expect(deriveApprovalPattern("medium", "hard")).toBe("suggest-apply");
  });

  it("returns explicit for medium stakes + irreversible", () => {
    expect(deriveApprovalPattern("medium", "irreversible")).toBe("explicit");
  });

  it("returns suggest-apply for high stakes + easy", () => {
    expect(deriveApprovalPattern("high", "easy")).toBe("suggest-apply");
  });

  it("returns explicit for high stakes + hard", () => {
    expect(deriveApprovalPattern("high", "hard")).toBe("explicit");
  });

  it("returns explicit for high stakes + irreversible", () => {
    expect(deriveApprovalPattern("high", "irreversible")).toBe("explicit");
  });
});

describe("createApprovalEnforcementHook", () => {
  it("allows tools with no risk profile", async () => {
    const hook = createApprovalEnforcementHook();
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({ riskProfile: undefined }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("allow");
  });

  it("allows tools with auto approval pattern", async () => {
    const hook = createApprovalEnforcementHook();
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({
        riskProfile: {
          stakes: "low",
          reversibility: "easy",
          approval: "auto",
        },
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("allow");
  });

  it("denies explicit approval tool when no callback provided", async () => {
    const hook = createApprovalEnforcementHook();
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({
        riskProfile: {
          stakes: "high",
          reversibility: "irreversible",
          approval: "explicit",
        },
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("deny");
    if (result.action === "deny") {
      expect(result.reason).toContain("explicit approval");
    }
  });

  it("allows explicit tool when listed in approvedTools", async () => {
    const hook = createApprovalEnforcementHook();
    const ctx = buildHookContext({
      toolName: "dangerous_tool",
      toolMetadata: buildToolMetadata({
        name: "dangerous_tool",
        riskProfile: {
          stakes: "high",
          reversibility: "irreversible",
          approval: "explicit",
        },
      }),
      context: buildToolContext({
        approvedTools: ["dangerous_tool"],
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("allow");
  });

  it("calls approval callback for non-auto tools", async () => {
    const callback = mock(async () => true);
    const hook = createApprovalEnforcementHook(callback);
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({
        riskProfile: {
          stakes: "medium",
          reversibility: "hard",
          approval: "suggest-apply",
        },
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("allow");
    expect(callback).toHaveBeenCalledWith("test_tool", {}, "suggest-apply");
  });

  it("denies when approval callback returns false", async () => {
    const callback = mock(async () => false);
    const hook = createApprovalEnforcementHook(callback);
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({
        riskProfile: {
          stakes: "high",
          reversibility: "hard",
          approval: "explicit",
        },
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("deny");
  });

  it("allows quick-confirm without callback (non-explicit)", async () => {
    const hook = createApprovalEnforcementHook();
    const ctx = buildHookContext({
      toolMetadata: buildToolMetadata({
        riskProfile: {
          stakes: "low",
          reversibility: "hard",
          approval: "quick-confirm",
        },
      }),
    });

    const result = await hook.handler(ctx);
    expect(result.action).toBe("allow");
  });
});

describe("HookRegistry pre-hook execution", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  it("runs hooks in priority order", async () => {
    const order: number[] = [];

    registry.registerPreHook({
      name: "second",
      priority: 10,
      handler() {
        order.push(10);
        return { action: "allow" };
      },
    });
    registry.registerPreHook({
      name: "first",
      priority: 0,
      handler() {
        order.push(0);
        return { action: "allow" };
      },
    });

    await registry.runPreHooks(buildHookContext());
    expect(order).toEqual([0, 10]);
  });

  it("stops at first non-allow result", async () => {
    let secondCalled = false;

    registry.registerPreHook({
      name: "blocker",
      priority: 0,
      handler: async () => ({ action: "deny" as const, reason: "blocked" }),
    });
    registry.registerPreHook({
      name: "second",
      priority: 10,
      handler() {
        secondCalled = true;
        return { action: "allow" };
      },
    });

    const result = await registry.runPreHooks(buildHookContext());
    expect(result.action).toBe("deny");
    expect(secondCalled).toBe(false);
  });

  it("respects tool pattern matching", async () => {
    let callCount = 0;
    const handler = () => {
      callCount += 1;
      return { action: "allow" as const };
    };

    registry.registerPreHook({
      name: "search-only",
      priority: 0,
      toolPattern: "search_*",
      handler,
    });

    await registry.runPreHooks(buildHookContext({ toolName: "search_hybrid" }));
    expect(callCount).toBe(1);

    await registry.runPreHooks(
      buildHookContext({ toolName: "delete_document" })
    );
    expect(callCount).toBe(1);
  });

  it("allows all when hooks disabled", async () => {
    const disabledRegistry = new HookRegistry({ enablePreHooks: false });
    disabledRegistry.registerPreHook({
      name: "blocker",
      priority: 0,
      handler: async () => ({ action: "deny" as const, reason: "blocked" }),
    });

    const result = await disabledRegistry.runPreHooks(buildHookContext());
    expect(result.action).toBe("allow");
  });
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import type { SessionOutboundMessage } from "@openplane/types/services/daemon/messages";
import {
  createDaemonTestContext,
  type DaemonTestContext,
  TEST_MODEL,
  TEST_THINKING_OPTION_ID,
  tmpCwd,
  waitForAgentUpdate,
} from "./e2e-helpers";

describe("daemon E2E - agent operations", () => {
  let ctx: DaemonTestContext;
  let messages: SessionOutboundMessage[];
  let unsubscribe: (() => void) | null;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
    messages = [];
    unsubscribe = ctx.client.subscribeRawMessages((message) => {
      messages.push(message);
    });
  });

  afterEach(async () => {
    unsubscribe?.();
    await ctx.cleanup();
  });

  describe("timestamp behavior", () => {
    test("opening agent without interaction does not update timestamp", async () => {
      const cwd = tmpCwd();
      try {
        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Timestamp Test Agent",
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");

        const initialUpdatedAt = agent.updatedAt;
        expect(initialUpdatedAt).toBeTruthy();

        await new Promise((resolve) => setTimeout(resolve, 1500));

        messages.length = 0;

        await ctx.client.fetchAgentTimeline(agent.id, {
          direction: "tail",
          limit: 200,
          projection: "projected",
        });
        const refreshedState = await ctx.client.fetchAgent(agent.id);

        expect(refreshedState?.status).toBe("idle");
        expect(refreshedState?.updatedAt).toBe(initialUpdatedAt);

        await ctx.client.clearAgentAttention(agent.id);

        await ctx.client.fetchAgentTimeline(agent.id, {
          direction: "tail",
          limit: 200,
          projection: "projected",
        });
        const stateAfterClear = await ctx.client.fetchAgent(agent.id);

        expect(stateAfterClear?.updatedAt).toBe(initialUpdatedAt);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);

    test("sending message updates timestamp", async () => {
      const cwd = tmpCwd();
      try {
        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Timestamp Update Test Agent",
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");

        const initialUpdatedAt = new Date(agent.updatedAt);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        await ctx.client.sendMessage(agent.id, "Say 'test' and nothing else");

        const finalState = await ctx.client.waitForFinish(agent.id, 120_000);
        expect(finalState.status).toBe("idle");

        const finalUpdatedAt = new Date(finalState.final?.updatedAt ?? 0);
        expect(finalUpdatedAt.getTime()).toBeGreaterThan(
          initialUpdatedAt.getTime()
        );
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 180_000);
  });

  describe("cancelAgent", () => {
    test("cancels a running agent mid-execution", async () => {
      const cwd = tmpCwd();
      try {
        await ctx.client.fetchAgents({
          subscribe: { subscriptionId: "agent-operations-cancel" },
        });

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Cancel Test Agent",
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");

        messages.length = 0;

        await ctx.client.sendMessage(agent.id, "Run: sleep 30");

        await ctx.client.waitForAgentUpsert(
          agent.id,
          (snapshot) => snapshot.status === "running",
          30_000
        );

        const cancelStart = Date.now();

        await ctx.client.cancelAgent(agent.id);

        const afterCancel = await ctx.client.waitForFinish(agent.id, 10_000);

        const cancelDuration = Date.now() - cancelStart;

        expect(cancelDuration).toBeLessThan(3000);

        expect(["idle", "error"]).toContain(afterCancel.status);

        const { execSync } = await import("node:child_process");
        try {
          const result = execSync("pgrep -f 'sleep 30'", {
            encoding: "utf8",
            timeout: 2000,
          });
          if (result.trim()) {
            execSync("pkill -f 'sleep 30'");
            throw new Error("Found zombie sleep processes after cancel");
          }
        } catch {
          // pgrep returns non-zero when no processes found
        }
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);
  });

  describe("setAgentMode", () => {
    test("switches agent mode and persists across messages", async () => {
      const cwd = tmpCwd();
      try {
        await ctx.client.fetchAgents({
          subscribe: { subscriptionId: "agent-operations-mode" },
        });

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Mode Switch Test Agent",
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");
        expect(agent.currentModeId).toBe("auto");

        messages.length = 0;
        const startPosition = messages.length;

        await ctx.client.setAgentMode(agent.id, "read-only");

        const stateAfterModeSwitch = await waitForAgentUpdate(
          messages,
          agent.id,
          (a) => a.currentModeId === "read-only",
          10_000,
          startPosition
        );

        expect(stateAfterModeSwitch.currentModeId).toBe("read-only");

        messages.length = 0;
        await ctx.client.sendMessage(agent.id, "Say 'hello' and nothing else");

        const finalState = await ctx.client.waitForFinish(agent.id, 120_000);

        expect(finalState.final?.currentModeId).toBe("read-only");
        expect(finalState.final?.runtimeInfo?.modeId).toBe("read-only");

        messages.length = 0;
        const position2 = messages.length;

        await ctx.client.setAgentMode(agent.id, "full-access");

        const stateAfterFullAccess = await waitForAgentUpdate(
          messages,
          agent.id,
          (a) => a.currentModeId === "full-access",
          10_000,
          position2
        );

        expect(stateAfterFullAccess.currentModeId).toBe("full-access");
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 30_000);
  });
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import type { SessionOutboundMessage } from "@openplane/types/services/daemon/messages";
import {
  createDaemonTestContext,
  type DaemonTestContext,
  extractAssistantText,
  TEST_MODEL,
  TEST_THINKING_OPTION_ID,
  tmpCwd,
} from "./e2e-helpers";

describe("daemon E2E - streaming", () => {
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

  test("streams assistant_message chunks that concatenate correctly", async () => {
    const cwd = tmpCwd();
    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Streaming Concat Test",
      });

      messages.length = 0;
      await ctx.client.sendMessage(
        agent.id,
        "Say 'hello world' and nothing else"
      );
      const finalState = await ctx.client.waitForFinish(agent.id, 120_000);
      expect(finalState.status).toBe("idle");

      const assistantText = extractAssistantText(messages, agent.id);
      expect(assistantText.length).toBeGreaterThan(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);

  test("sending a new message while a run is active does not mix streams", async () => {
    const cwd = tmpCwd();
    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Overlap Stream Test",
        modeId: "full-access",
      });

      messages.length = 0;
      await ctx.client.sendMessage(agent.id, "Run: sleep 30");

      await ctx.client.waitForAgentUpsert(
        agent.id,
        (snapshot) => snapshot.status === "running",
        30_000
      );

      await ctx.client.sendMessage(
        agent.id,
        "Say 'state saved' and nothing else"
      );
      const finalState = await ctx.client.waitForFinish(agent.id, 120_000);
      expect(finalState.status).toBe("idle");

      const assistantText = extractAssistantText(
        messages,
        agent.id
      ).toLowerCase();
      expect(assistantText).toContain("state saved");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);
});

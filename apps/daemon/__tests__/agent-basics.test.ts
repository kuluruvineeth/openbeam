import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import {
  createDaemonTestContext,
  createMessageCollector,
  type DaemonTestContext,
  type MessageCollector,
  TEST_MODEL,
  TEST_THINKING_OPTION_ID,
  tmpCwd,
} from "./e2e-helpers";

describe("daemon E2E - agent basics", () => {
  let ctx: DaemonTestContext;
  let collector: MessageCollector;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
    collector = createMessageCollector(ctx.client);
  });

  afterEach(async () => {
    collector.unsubscribe();
    await ctx.cleanup();
  });

  test("creates agent and receives response", async () => {
    const agent = await ctx.client.createAgent({
      provider: "codex",
      model: TEST_MODEL,
      thinkingOptionId: TEST_THINKING_OPTION_ID,
      cwd: "/tmp",
      title: "Test Agent",
    });

    expect(agent.id).toBeTruthy();
    expect(agent.provider).toBe("codex");
    expect(agent.status).toBe("idle");
    expect(agent.cwd).toBe("/tmp");

    await ctx.client.sendMessage(
      agent.id,
      "Say 'hello world' and nothing else"
    );

    const finalState = await ctx.client.waitForFinish(agent.id, 120_000);

    expect(finalState.status).toBe("idle");
    expect(finalState.final?.lastError).toBeUndefined();
    expect(finalState.final?.id).toBe(agent.id);

    const streamEvents = collector.messages.filter(
      (m) => m.type === "agent_stream" && m.payload.agentId === agent.id
    );
    expect(streamEvents.length).toBeGreaterThan(0);

    const hasTurnStarted = streamEvents.some(
      (m) =>
        m.type === "agent_stream" && m.payload.event.type === "turn_started"
    );
    expect(hasTurnStarted).toBe(true);

    const hasTurnCompleted = streamEvents.some(
      (m) =>
        m.type === "agent_stream" && m.payload.event.type === "turn_completed"
    );
    expect(hasTurnCompleted).toBe(true);

    const hasAssistantMessage = streamEvents.some((m) => {
      if (m.type !== "agent_stream" || m.payload.event.type !== "timeline") {
        return false;
      }
      const item = m.payload.event.item;
      return item.type === "assistant_message" && item.text.length > 0;
    });
    expect(hasAssistantMessage).toBe(true);
  }, 180_000);

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  test("fails to create agent with non-existent cwd", async () => {
    const nonExistentCwd = "/this/path/does/not/exist/12345";

    expect(
      ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd: nonExistentCwd,
        title: "Should Fail Agent",
      })
    ).rejects.toThrow(nonExistentCwd);
  });

  test("lists agents and reflects create/delete operations", async () => {
    const cwd1 = tmpCwd();
    const cwd2 = tmpCwd();

    try {
      const initialAgents = await ctx.client.fetchAgents();
      expect(initialAgents.entries).toHaveLength(0);

      const agent1 = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd: cwd1,
        title: "List Test Agent 1",
      });

      expect(agent1.id).toBeTruthy();
      expect(agent1.status).toBe("idle");

      const afterFirst = await ctx.client.fetchAgents();
      expect(afterFirst.entries).toHaveLength(1);
      expect(afterFirst.entries[0]?.agent.id).toBe(agent1.id);
      expect(afterFirst.entries[0]?.agent.cwd).toBe(cwd1);

      const agent2 = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd: cwd2,
        title: "List Test Agent 2",
      });

      expect(agent2.id).toBeTruthy();
      expect(agent2.status).toBe("idle");

      const afterSecond = await ctx.client.fetchAgents();
      expect(afterSecond.entries).toHaveLength(2);

      const ids = afterSecond.entries.map((a) => a.agent.id);
      expect(ids).toContain(agent1.id);
      expect(ids).toContain(agent2.id);

      await ctx.client.deleteAgent(agent1.id);

      const afterDelete = await ctx.client.fetchAgents();
      expect(afterDelete.entries).toHaveLength(1);
      expect(afterDelete.entries[0]?.agent.id).toBe(agent2.id);

      await ctx.client.deleteAgent(agent2.id);
    } finally {
      rmSync(cwd1, { recursive: true, force: true });
      rmSync(cwd2, { recursive: true, force: true });
    }
  }, 60_000);
});

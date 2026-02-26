import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SessionOutboundMessage } from "@openplane/types/services/daemon/messages";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  createDaemonTestContext,
  type DaemonTestContext,
} from "../test-utils/index.js";

function tmpCwd(): string {
  return mkdtempSync(path.join(tmpdir(), "daemon-orch-"));
}

function extractAssistantText(
  msgs: SessionOutboundMessage[],
  agentId: string
): string {
  const parts: string[] = [];
  for (const m of msgs) {
    if (
      m.type === "agent_stream" &&
      m.payload.agentId === agentId &&
      m.payload.event.type === "timeline" &&
      m.payload.event.item.type === "assistant_message"
    ) {
      parts.push(m.payload.event.item.text);
    }
  }
  return parts.join("");
}

describe("multi-agent orchestration", () => {
  let ctx: DaemonTestContext;
  let messages: SessionOutboundMessage[];
  let unsubscribe: (() => void) | null;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
    messages = [];
    unsubscribe = ctx.client.subscribeRawMessages((msg) => {
      messages.push(msg);
    });
  });

  afterEach(async () => {
    unsubscribe?.();
    await ctx.cleanup();
  }, 60_000);

  test("concurrent agent creation across providers", async () => {
    const cwd = tmpCwd();
    try {
      const agents = await Promise.all([
        ctx.client.createAgent({
          provider: "codex",
          cwd,
          title: "Codex Agent",
        }),
        ctx.client.createAgent({
          provider: "claude",
          cwd,
          title: "Claude Agent",
        }),
        ctx.client.createAgent({
          provider: "opencode",
          cwd,
          title: "OpenCode Agent",
        }),
      ]);

      expect(agents).toHaveLength(3);

      const ids = new Set(agents.map((a) => a.id));
      expect(ids.size).toBe(3);

      for (const agent of agents) {
        expect(agent.status).toBe("idle");
        expect(agent.cwd).toBe(cwd);
      }

      expect(agents[0]?.provider).toBe("codex");
      expect(agents[1]?.provider).toBe("claude");
      expect(agents[2]?.provider).toBe("opencode");

      const listed = await ctx.client.fetchAgents();
      expect(listed.entries).toHaveLength(3);

      const listedIds = new Set(listed.entries.map((e) => e.agent.id));
      for (const agent of agents) {
        expect(listedIds.has(agent.id)).toBe(true);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("parallel execution routes responses to correct agents", async () => {
    const cwd1 = tmpCwd();
    const cwd2 = tmpCwd();

    try {
      const agent1 = await ctx.client.createAgent({
        provider: "codex",
        cwd: cwd1,
        title: "Parallel Agent 1",
      });
      const agent2 = await ctx.client.createAgent({
        provider: "codex",
        cwd: cwd2,
        title: "Parallel Agent 2",
      });

      messages.length = 0;

      await Promise.all([
        ctx.client.sendMessage(
          agent1.id,
          "respond with exactly: alpha-response"
        ),
        ctx.client.sendMessage(
          agent2.id,
          "respond with exactly: beta-response"
        ),
      ]);

      const [result1, result2] = await Promise.all([
        ctx.client.waitForFinish(agent1.id, 30_000),
        ctx.client.waitForFinish(agent2.id, 30_000),
      ]);

      expect(result1.status).toBe("idle");
      expect(result2.status).toBe("idle");

      const text1 = extractAssistantText(messages, agent1.id);
      const text2 = extractAssistantText(messages, agent2.id);

      expect(text1).toContain("alpha-response");
      expect(text2).toContain("beta-response");
      expect(text1).not.toContain("beta-response");
      expect(text2).not.toContain("alpha-response");
    } finally {
      rmSync(cwd1, { recursive: true, force: true });
      rmSync(cwd2, { recursive: true, force: true });
    }
  }, 60_000);

  test("deleting one agent preserves siblings", async () => {
    const cwd1 = tmpCwd();
    const cwd2 = tmpCwd();
    const cwd3 = tmpCwd();

    try {
      const [agent1, agent2, agent3] = await Promise.all([
        ctx.client.createAgent({
          provider: "codex",
          cwd: cwd1,
          title: "Persist Agent 1",
        }),
        ctx.client.createAgent({
          provider: "claude",
          cwd: cwd2,
          title: "Persist Agent 2",
        }),
        ctx.client.createAgent({
          provider: "opencode",
          cwd: cwd3,
          title: "Persist Agent 3",
        }),
      ]);

      const beforeDelete = await ctx.client.fetchAgents();
      expect(beforeDelete.entries).toHaveLength(3);

      await ctx.client.deleteAgent(agent2?.id);

      const afterDelete = await ctx.client.fetchAgents();
      expect(afterDelete.entries).toHaveLength(2);

      const remainingIds = afterDelete.entries.map((e) => e.agent.id);
      expect(remainingIds).toContain(agent1?.id);
      expect(remainingIds).toContain(agent3?.id);
      expect(remainingIds).not.toContain(agent2?.id);

      messages.length = 0;
      await ctx.client.sendMessage(
        agent1?.id,
        "respond with exactly: still-alive"
      );
      const result = await ctx.client.waitForFinish(agent1?.id, 30_000);
      expect(result.status).toBe("idle");

      const text = extractAssistantText(messages, agent1?.id);
      expect(text).toContain("still-alive");
    } finally {
      rmSync(cwd1, { recursive: true, force: true });
      rmSync(cwd2, { recursive: true, force: true });
      rmSync(cwd3, { recursive: true, force: true });
    }
  }, 60_000);

  test("stream events route exclusively to their agent", async () => {
    const cwd1 = tmpCwd();
    const cwd2 = tmpCwd();

    try {
      const agent1 = await ctx.client.createAgent({
        provider: "codex",
        cwd: cwd1,
        title: "Stream Agent 1",
      });
      const agent2 = await ctx.client.createAgent({
        provider: "codex",
        cwd: cwd2,
        title: "Stream Agent 2",
      });

      messages.length = 0;

      await ctx.client.sendMessage(
        agent1.id,
        "respond with exactly: stream-one"
      );
      await ctx.client.waitForFinish(agent1.id, 30_000);

      const agent1Streams = messages.filter(
        (m) => m.type === "agent_stream" && m.payload.agentId === agent1.id
      );
      const agent2StreamsDuringAgent1 = messages.filter(
        (m) => m.type === "agent_stream" && m.payload.agentId === agent2.id
      );

      expect(agent1Streams.length).toBeGreaterThan(0);
      expect(agent2StreamsDuringAgent1).toHaveLength(0);

      const hasTurnStarted = agent1Streams.some(
        (m) =>
          m.type === "agent_stream" && m.payload.event.type === "turn_started"
      );
      const hasTurnCompleted = agent1Streams.some(
        (m) =>
          m.type === "agent_stream" && m.payload.event.type === "turn_completed"
      );

      expect(hasTurnStarted).toBe(true);
      expect(hasTurnCompleted).toBe(true);

      messages.length = 0;

      await ctx.client.sendMessage(
        agent2.id,
        "respond with exactly: stream-two"
      );
      await ctx.client.waitForFinish(agent2.id, 30_000);

      const agent2Streams = messages.filter(
        (m) => m.type === "agent_stream" && m.payload.agentId === agent2.id
      );
      const agent1StreamsDuringAgent2 = messages.filter(
        (m) => m.type === "agent_stream" && m.payload.agentId === agent1.id
      );

      expect(agent2Streams.length).toBeGreaterThan(0);
      expect(agent1StreamsDuringAgent2).toHaveLength(0);
    } finally {
      rmSync(cwd1, { recursive: true, force: true });
      rmSync(cwd2, { recursive: true, force: true });
    }
  }, 60_000);
});

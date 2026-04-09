import { describe, expect, it, mock } from "bun:test";
import type { UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../../src/identity/resolver";

mock.module("@openbeam/services", () => ({
  hybridSearch: () =>
    Promise.resolve({ documents: [], total: 0, queryTime: 0 }),
  ragAnswer: () =>
    Promise.resolve({
      answer: "test answer",
      citations: [],
      context: { documents: [] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }),
  dispatchAction: () => Promise.resolve({ success: true, data: {} }),
}));

mock.module("@openbeam/db", () => ({
  default: {},
  searchEntities: () => Promise.resolve([]),
  getExpertsForTopic: () => Promise.resolve([]),
}));

import { routeMessage } from "../../src/handlers/router";

const identity: ResolvedIdentity = { teamId: "t1", userId: "u1" };

function msg(overrides: Partial<UnifiedMessage> = {}): UnifiedMessage {
  return {
    id: "m1",
    platform: "SLACK",
    platformUserId: "U1",
    platformTeamId: "T1",
    channelId: "C1",
    text: "hello",
    isDirectMessage: false,
    isMention: false,
    timestamp: new Date(),
    rawEvent: {},
    ...overrides,
  };
}

describe("routeMessage", () => {
  it("returns help for help command", async () => {
    const r = await routeMessage(msg({ command: "help" }), identity);
    expect(r.type).toBe("text");
    expect(r.text).toContain("OpenBeam Bot Commands");
  });

  it("dispatches search command and returns results type", async () => {
    const r = await routeMessage(
      msg({ command: "search", text: "search deploy docs" }),
      identity
    );
    expect(r.type).toBe("text");
  });

  it("dispatches ask command and returns answer type", async () => {
    const r = await routeMessage(
      msg({ command: "ask", text: "ask what is our process" }),
      identity
    );
    expect(r.type).toBe("answer");
    expect(r.text).toBe("test answer");
  });

  it("dispatches expert command and returns text", async () => {
    const r = await routeMessage(
      msg({ command: "expert", text: "expert react" }),
      identity
    );
    expect(r.type).toBe("text");
  });

  it("dispatches action command", async () => {
    const r = await routeMessage(
      msg({ command: "action", text: "action conn_1 issue_create {}" }),
      identity
    );
    expect(r.type).toBe("action_result");
  });

  it("returns prompt for non-DM non-mention", async () => {
    const r = await routeMessage(msg(), identity);
    expect(r.type).toBe("text");
    expect(r.text).toContain("Mention me");
  });

  it("routes DM to ask handler by default", async () => {
    const r = await routeMessage(
      msg({ isDirectMessage: true, text: "tell me about architecture" }),
      identity
    );
    expect(r.type).toBe("answer");
  });

  it("detects search intent from DM", async () => {
    const r = await routeMessage(
      msg({ isDirectMessage: true, text: "find deployment runbook" }),
      identity
    );
    expect(r.type).toBe("text");
  });

  it("ignores unknown commands", async () => {
    const r = await routeMessage(msg({ command: "nonexistent" }), identity);
    expect(r.type).toBe("text");
    expect(r.text).toContain("Mention me");
  });

  it("responds to greetings with welcome message", async () => {
    const r = await routeMessage(
      msg({ isDirectMessage: true, text: "hello" }),
      identity
    );
    expect(r.type).toBe("text");
    expect(r.text).toContain("OpenBeam");
    expect(r.text).toContain("ask");
    expect(r.text).toContain("search");
  });

  it("responds to greetings case-insensitively", async () => {
    const r = await routeMessage(
      msg({ isDirectMessage: true, text: "Hey!" }),
      identity
    );
    expect(r.type).toBe("text");
    expect(r.text).toContain("OpenBeam");
  });

  it("does not treat greeting-like questions as greetings", async () => {
    const r = await routeMessage(
      msg({ isDirectMessage: true, text: "hello world deploy docs?" }),
      identity
    );
    expect(r.type).toBe("answer");
  });
});

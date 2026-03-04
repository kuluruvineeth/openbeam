import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createTestLogger } from "../../test-utils/test-logger";
import type { AgentStreamEvent } from "../agent-sdk-types";
import { ClaudeAgentClient } from "./claude-agent";

type QueryMock = {
  next: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  return: ReturnType<typeof vi.fn>;
  setPermissionMode: ReturnType<typeof vi.fn>;
  setModel: ReturnType<typeof vi.fn>;
  supportedModels: ReturnType<typeof vi.fn>;
  supportedCommands: ReturnType<typeof vi.fn>;
  rewindFiles: ReturnType<typeof vi.fn>;
};

const sdkMocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryMock: null as QueryMock | null,
}));

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: sdkMocks.query,
}));

function buildQueryMock(): QueryMock {
  const events = [
    {
      type: "system",
      subtype: "init",
      session_id: "claude-prime-timeout-session",
      permissionMode: "default",
      model: "sonnet",
    },
    {
      type: "assistant",
      message: {
        content: "hello",
      },
    },
    {
      type: "result",
      subtype: "success",
      usage: {
        input_tokens: 1,
        cache_read_input_tokens: 0,
        output_tokens: 1,
      },
      total_cost_usd: 0,
    },
  ];
  let index = 0;

  return {
    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    next: vi.fn(async () => {
      if (index >= events.length) {
        return { done: true, value: undefined };
      }
      const value = events[index];
      index += 1;
      return { done: false, value };
    }),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    interrupt: vi.fn(async () => {}),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    return: vi.fn(async () => {}),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    setPermissionMode: vi.fn(async () => {}),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    setModel: vi.fn(async () => {}),
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    supportedModels: vi.fn(() => new Promise<never>(() => {})),
    supportedCommands: vi.fn(async () => []),
    rewindFiles: vi.fn(async () => ({ canRewind: true })),
  };
}

async function collectUntilTerminal(
  stream: AsyncGenerator<AgentStreamEvent>
): Promise<AgentStreamEvent[]> {
  const events: AgentStreamEvent[] = [];
  for await (const event of stream) {
    events.push(event);
    if (
      event.type === "turn_completed" ||
      event.type === "turn_failed" ||
      event.type === "turn_canceled"
    ) {
      break;
    }
  }
  return events;
}

describe("ClaudeAgentSession model priming timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sdkMocks.queryMock = buildQueryMock();
    sdkMocks.query.mockReturnValue(sdkMocks.queryMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    sdkMocks.query.mockReset();
    sdkMocks.queryMock = null;
  });

  test("continues streaming when supportedModels hangs during query priming", async () => {
    const client = new ClaudeAgentClient({ logger: createTestLogger() });
    const session = await client.createSession({
      provider: "claude",
      cwd: process.cwd(),
    });

    const turnPromise = collectUntilTerminal(session.stream("Say hello"));
    await vi.advanceTimersByTimeAsync(4200);
    const events = await turnPromise;

    expect(events.some((event) => event.type === "turn_completed")).toBe(true);
    expect(sdkMocks.queryMock?.setPermissionMode).toHaveBeenCalledWith(
      "default"
    );

    await session.close();
  });
});

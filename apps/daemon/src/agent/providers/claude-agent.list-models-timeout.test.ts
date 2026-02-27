import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createTestLogger } from "../../test-utils/test-logger.js";
import { ClaudeAgentClient } from "./claude-agent.js";

type QueryMock = {
  supportedModels: ReturnType<typeof vi.fn>;
  return: ReturnType<typeof vi.fn>;
};

const sdkMocks = vi.hoisted(() => ({
  query: vi.fn(),
  queryMock: null as QueryMock | null,
}));

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: sdkMocks.query,
}));

describe("ClaudeAgentClient.listModels timeout handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    sdkMocks.query.mockReset();
    sdkMocks.queryMock = null;
  });

  test("falls back to static aliases when Claude SDK model discovery hangs", async () => {
    sdkMocks.queryMock = {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      supportedModels: vi.fn(() => new Promise<never>(() => {})),
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      return: vi.fn(async () => {}),
    };
    sdkMocks.query.mockReturnValue(sdkMocks.queryMock);

    const client = new ClaudeAgentClient({ logger: createTestLogger() });
    const listPromise = client.listModels();
    await vi.advanceTimersByTimeAsync(6100);
    const models = await listPromise;

    expect(models.length).toBeGreaterThan(0);
    expect(models.map((model) => model.id)).toEqual(
      expect.arrayContaining(["default", "sonnet", "opus", "haiku"])
    );
    expect(sdkMocks.queryMock.return).toHaveBeenCalledTimes(1);
  });
});

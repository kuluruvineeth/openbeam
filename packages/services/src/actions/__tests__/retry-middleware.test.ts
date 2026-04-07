import { describe, expect, it, mock } from "bun:test";
import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";
import { ActionExecutorError, ActionRateLimitError } from "../errors";
import { createIdempotentRetryMiddleware } from "../retry-middleware";
import type { ActionExecutionResult, DispatchRequest } from "../types";

const IDEMPOTENT_ACTION: ConnectorActionDefinition = {
  id: "safe_read",
  name: "Safe Read",
  description: "",
  connectorType: "test",
  resource: "item",
  category: "read",
  inputs: [],
  outputs: [],
  stakes: "low",
  reversible: false,
  batchSupport: false,
  idempotent: true,
};

const NON_IDEMPOTENT_ACTION: ConnectorActionDefinition = {
  id: "dangerous_write",
  name: "Dangerous Write",
  description: "",
  connectorType: "test",
  resource: "item",
  category: "create",
  inputs: [],
  outputs: [],
  stakes: "high",
  reversible: false,
  batchSupport: false,
  idempotent: false,
};

const ACTIONS = new Map([
  [IDEMPOTENT_ACTION.id, IDEMPOTENT_ACTION],
  [NON_IDEMPOTENT_ACTION.id, NON_IDEMPOTENT_ACTION],
]);

function testLookup(
  _connectorType: string,
  actionId: string
): ConnectorActionDefinition | undefined {
  return ACTIONS.get(actionId);
}

const middleware = createIdempotentRetryMiddleware(testLookup);

function makeRequest(
  overrides: Partial<DispatchRequest> = {}
): DispatchRequest {
  return {
    connectorId: "conn_1",
    connectorType: "test",
    actionId: "safe_read",
    params: {},
    teamId: "team_1",
    userId: "user_1",
    source: "api",
    ...overrides,
  };
}

const OK_RESULT: ActionExecutionResult = {
  success: true,
  data: { items: [] },
};

describe("idempotentRetryMiddleware", () => {
  it("passes through on success", async () => {
    const next = mock(() => Promise.resolve(OK_RESULT));
    const result = await middleware(makeRequest(), next);
    expect(result.success).toBe(true);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-idempotent actions", async () => {
    const next = mock(() => {
      throw new ActionRateLimitError(100);
    });
    await expect(
      middleware(makeRequest({ actionId: "dangerous_write" }), next)
    ).rejects.toThrow("Rate limited");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("retries idempotent actions on retryable errors", async () => {
    let calls = 0;
    const next = mock(() => {
      calls += 1;
      if (calls < 2) {
        throw new ActionRateLimitError(100);
      }
      return Promise.resolve(OK_RESULT);
    });
    const result = await middleware(makeRequest(), next);
    expect(result.success).toBe(true);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable errors on idempotent actions", async () => {
    const next = mock(() => {
      throw new ActionExecutorError({
        code: "NOT_FOUND",
        message: "not found",
        retryable: false,
      });
    });
    await expect(middleware(makeRequest(), next)).rejects.toThrow("not found");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("skips retry logic when connectorType is missing", async () => {
    const next = mock(() => {
      throw new ActionRateLimitError(100);
    });
    await expect(
      middleware(makeRequest({ connectorType: undefined }), next)
    ).rejects.toThrow("Rate limited");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("gives up after max retries", async () => {
    const next = mock(() => {
      throw new ActionRateLimitError(100);
    });
    await expect(middleware(makeRequest(), next)).rejects.toThrow(
      "Rate limited"
    );
    expect(next).toHaveBeenCalledTimes(3);
  });
});

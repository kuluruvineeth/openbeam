import { afterEach, describe, expect, it } from "bun:test";
import type { DispatchMiddleware } from "../middleware";
import {
  clearDispatchMiddlewares,
  composeDispatchMiddlewares,
  registerDispatchMiddleware,
} from "../middleware";
import type { ActionExecutionResult, DispatchRequest } from "../types";

const baseRequest: DispatchRequest = {
  connectorId: "conn_1",
  actionId: "test_action",
  params: {},
  teamId: "team_1",
  userId: "user_1",
  source: "api",
};

const successResult: ActionExecutionResult = {
  success: true,
  data: { ok: true },
};

function record(label: string, log: string[]): DispatchMiddleware {
  return async (_request, next) => {
    log.push(`${label}:before`);
    const result = await next();
    log.push(`${label}:after`);
    return result;
  };
}

function shortCircuit(payload: ActionExecutionResult): DispatchMiddleware {
  return (_request, _next) => Promise.resolve(payload);
}

function registerMany(values: DispatchMiddleware[]): void {
  for (const middleware of values) {
    registerDispatchMiddleware(middleware);
  }
}

describe("composeDispatchMiddlewares", () => {
  afterEach(() => {
    clearDispatchMiddlewares();
  });

  it("invokes the terminal handler when no middleware is registered", async () => {
    let terminalCalls = 0;
    const next = composeDispatchMiddlewares(baseRequest, () => {
      terminalCalls += 1;
      return Promise.resolve(successResult);
    });

    const result = await next();

    expect(terminalCalls).toBe(1);
    expect(result).toEqual(successResult);
  });

  it("invokes middlewares in registration order around the terminal", async () => {
    const log: string[] = [];
    registerMany([record("a", log), record("b", log), record("c", log)]);

    const next = composeDispatchMiddlewares(baseRequest, () => {
      log.push("terminal");
      return Promise.resolve(successResult);
    });

    await next();

    expect(log).toEqual([
      "a:before",
      "b:before",
      "c:before",
      "terminal",
      "c:after",
      "b:after",
      "a:after",
    ]);
  });

  it("short-circuits subsequent middlewares and the terminal", async () => {
    const log: string[] = [];
    const blocked: ActionExecutionResult = {
      success: false,
      data: {},
      error: "blocked",
    };
    registerMany([
      record("first", log),
      shortCircuit(blocked),
      record("never", log),
    ]);

    const next = composeDispatchMiddlewares(baseRequest, () => {
      log.push("terminal");
      return Promise.resolve(successResult);
    });

    const result = await next();

    expect(result).toEqual(blocked);
    expect(log).toEqual(["first:before", "first:after"]);
  });

  it("propagates errors thrown by the terminal", async () => {
    const next = composeDispatchMiddlewares(baseRequest, () =>
      Promise.reject(new Error("boom"))
    );

    await expect(next()).rejects.toThrow("boom");
  });

  it("allows middlewares to wrap thrown errors", async () => {
    const wrap: DispatchMiddleware = async (_request, downstream) => {
      try {
        return await downstream();
      } catch (_error) {
        return { success: false, data: {}, error: "wrapped" };
      }
    };
    registerMany([wrap]);

    const next = composeDispatchMiddlewares(baseRequest, () =>
      Promise.reject(new Error("boom"))
    );

    const result = await next();

    expect(result).toEqual({
      success: false,
      data: {},
      error: "wrapped",
    });
  });

  it("clearDispatchMiddlewares empties the chain", async () => {
    const log: string[] = [];
    registerMany([record("a", log)]);
    clearDispatchMiddlewares();

    const next = composeDispatchMiddlewares(baseRequest, () =>
      Promise.resolve(successResult)
    );

    await next();

    expect(log).toEqual([]);
  });
});

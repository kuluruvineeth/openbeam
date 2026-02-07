import type { Client } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import {
  type NativeConnection,
  Worker,
  type WorkerOptions,
} from "@temporalio/worker";

export interface TestEnvOptions {
  taskQueue?: string;
  activities?: Record<string, unknown>;
  workflowsPath?: string;
  enableTimeSkipping?: boolean;
}

export interface TestEnv {
  client: Client;
  nativeConnection: NativeConnection;
  worker: Worker | null;
  env: TestWorkflowEnvironment;
  sleep: (ms: number) => Promise<void>;
  runUntil: <T>(fn: () => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

export type MockActivity<T extends (...args: unknown[]) => unknown> = {
  mock: T;
  calls: Parameters<T>[];
  returns: ReturnType<T>[];
  reset: () => void;
  mockReturnValue: (value: Awaited<ReturnType<T>>) => void;
  mockReturnValueOnce: (value: Awaited<ReturnType<T>>) => void;
  mockImplementation: (impl: T) => void;
  mockRejectedValue: (error: Error) => void;
  mockRejectedValueOnce: (error: Error) => void;
};

export function mockActivities<T extends Record<string, unknown>>(
  activities: Partial<T>
): {
  activities: T;
  mocks: {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
      ? MockActivity<T[K]>
      : never;
  };
} {
  const mocks: Record<
    string,
    MockActivity<(...args: unknown[]) => unknown>
  > = {};
  const wrappedActivities: Record<string, unknown> = {};

  for (const [name, impl] of Object.entries(activities)) {
    if (typeof impl !== "function") {
      wrappedActivities[name] = impl;
      continue;
    }

    const calls: unknown[][] = [];
    const returns: unknown[] = [];
    let returnValues: unknown[] = [];
    let currentImpl = impl as (...args: unknown[]) => unknown;
    let rejectedError: Error | null = null;
    let rejectedOnce: Error | null = null;

    const mock = (async (...args: unknown[]) => {
      calls.push(args);

      if (rejectedOnce) {
        const err = rejectedOnce;
        rejectedOnce = null;
        throw err;
      }

      if (rejectedError) {
        throw rejectedError;
      }

      if (returnValues.length > 0) {
        const value = returnValues.shift();
        returns.push(value);
        return value;
      }

      const result = await currentImpl(...args);
      returns.push(result);
      return result;
    }) as typeof impl;

    const mockActivity: MockActivity<typeof impl> = {
      mock,
      calls: calls as Parameters<typeof impl>[],
      returns: returns as ReturnType<typeof impl>[],
      reset: () => {
        calls.length = 0;
        returns.length = 0;
        returnValues = [];
        rejectedError = null;
        rejectedOnce = null;
        currentImpl = impl as (...args: unknown[]) => unknown;
      },
      mockReturnValue: (value) => {
        returnValues = [value];
      },
      mockReturnValueOnce: (value) => {
        returnValues.push(value);
      },
      mockImplementation: (newImpl) => {
        currentImpl = newImpl as (...args: unknown[]) => unknown;
      },
      mockRejectedValue: (error) => {
        rejectedError = error;
      },
      mockRejectedValueOnce: (error) => {
        rejectedOnce = error;
      },
    };

    mocks[name] = mockActivity as MockActivity<(...args: unknown[]) => unknown>;
    wrappedActivities[name] = mock;
  }

  return {
    activities: wrappedActivities as T,
    mocks: mocks as unknown as {
      [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
        ? MockActivity<T[K]>
        : never;
    },
  };
}

export async function createTestEnv(
  options: TestEnvOptions = {}
): Promise<TestEnv> {
  const {
    taskQueue = "test-queue",
    activities = {},
    workflowsPath,
    enableTimeSkipping = true,
  } = options;

  const env = await TestWorkflowEnvironment.createTimeSkipping();

  let worker: Worker | null = null;

  if (workflowsPath) {
    const workerOptions: WorkerOptions = {
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath,
      activities,
    };

    worker = await Worker.create(workerOptions);
  }

  const sleep = async (ms: number): Promise<void> => {
    if (enableTimeSkipping) {
      await env.sleep(ms);
    } else {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  };

  // biome-ignore lint/suspicious/useAwait: returns promise directly, caller awaits
  const runUntil = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (!worker) {
      return fn();
    }

    return env.client.workflow.execute(fn as unknown as () => Promise<T>, {
      taskQueue,
      workflowId: `test-${Date.now()}`,
    });
  };

  const close = async (): Promise<void> => {
    await env.teardown();
  };

  return {
    client: env.client,
    nativeConnection: env.nativeConnection,
    worker,
    env,
    sleep,
    runUntil,
    close,
  };
}

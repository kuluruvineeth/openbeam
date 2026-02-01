import type { WorkflowHandle } from "@temporalio/client";
import type { Workflow } from "@temporalio/workflow";

export type WorkflowAssertion = {
  status: "COMPLETED" | "FAILED" | "RUNNING" | "CANCELLED" | "TERMINATED";
  result?: unknown;
  error?: Error;
  duration?: number;
};

export async function getWorkflowResult<T extends Workflow>(
  handle: WorkflowHandle<T>
): Promise<{ result: unknown; error: Error | null }> {
  try {
    const result = await handle.result();
    return { result, error: null };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function assertWorkflowCompleted<T extends Workflow>(
  handle: WorkflowHandle<T>,
  expectedResult?: Awaited<ReturnType<T>>
): Promise<Awaited<ReturnType<T>>> {
  const { result, error } = await getWorkflowResult(handle);

  if (error) {
    throw new Error(
      `Expected workflow to complete but it failed: ${error.message}`
    );
  }

  const info = await handle.describe();
  if (info.status.name !== "COMPLETED") {
    throw new Error(
      `Expected workflow status COMPLETED but got ${info.status.name}`
    );
  }

  if (expectedResult !== undefined && result !== expectedResult) {
    throw new Error(
      `Expected result ${JSON.stringify(expectedResult)} but got ${JSON.stringify(result)}`
    );
  }

  return result as Awaited<ReturnType<T>>;
}

export async function assertWorkflowFailed<T extends Workflow>(
  handle: WorkflowHandle<T>,
  expectedErrorMessage?: string | RegExp
): Promise<Error> {
  const { error } = await getWorkflowResult(handle);

  if (!error) {
    throw new Error("Expected workflow to fail but it completed successfully");
  }

  const info = await handle.describe();
  if (info.status.name !== "FAILED") {
    throw new Error(
      `Expected workflow status FAILED but got ${info.status.name}`
    );
  }

  if (expectedErrorMessage) {
    if (typeof expectedErrorMessage === "string") {
      if (!error.message.includes(expectedErrorMessage)) {
        throw new Error(
          `Expected error message to contain "${expectedErrorMessage}" but got "${error.message}"`
        );
      }
    } else if (!expectedErrorMessage.test(error.message)) {
      throw new Error(
        `Expected error message to match ${expectedErrorMessage} but got "${error.message}"`
      );
    }
  }

  return error;
}

export async function expectSignalHandled<T extends Workflow>(
  handle: WorkflowHandle<T>,
  signalName: string
): Promise<void> {
  const historyResult = await handle.fetchHistory();

  if (!historyResult?.events) {
    throw new Error("Could not fetch workflow history");
  }

  const signalEvent = historyResult.events.find(
    (event) =>
      event.workflowExecutionSignaledEventAttributes?.signalName === signalName
  );

  if (!signalEvent) {
    throw new Error(`Signal "${signalName}" was not found in workflow history`);
  }
}

export async function waitForWorkflowStatus<T extends Workflow>(
  handle: WorkflowHandle<T>,
  status: string,
  timeoutMs = 30_000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const info = await handle.describe();
    if (info.status.name === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const info = await handle.describe();
  throw new Error(
    `Timeout waiting for status ${status}. Current status: ${info.status.name}`
  );
}

export async function assertWorkflowRunning<T extends Workflow>(
  handle: WorkflowHandle<T>
): Promise<void> {
  const info = await handle.describe();

  if (info.status.name !== "RUNNING") {
    throw new Error(
      `Expected workflow to be RUNNING but got ${info.status.name}`
    );
  }
}

export async function assertWorkflowCancelled<T extends Workflow>(
  handle: WorkflowHandle<T>
): Promise<void> {
  const info = await handle.describe();

  if (info.status.name !== "CANCELLED") {
    throw new Error(
      `Expected workflow to be CANCELLED but got ${info.status.name}`
    );
  }
}

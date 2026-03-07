import type { Database } from "@openbeam/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openbeam/db";
import { evaluateExpression } from "@openbeam/services/canvas/expression";
import { resolveNodeConfig } from "@openbeam/services/canvas/node-config";
import { LoopNodeConfigSchema } from "@openbeam/types/canvas";
import type {
  ExecuteLoopNodeInput,
  ExecuteLoopNodeOutput,
  LoopIterationError,
  LoopState,
} from "@openbeam/types/temporal";
import { Context } from "@temporalio/activity";
import { SAFETY_CEILINGS } from "../../config/constants";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

export interface ExecuteLoopNodeDependencies {
  db: Database;
  maxInlineBytes?: number;
}

type LoopContextParams = {
  currentValue: unknown;
  initialInput: unknown;
  item: unknown;
  index: number;
  iteration: number;
  lastOutput: unknown;
  results: unknown[];
  errors: LoopIterationError[];
};

type LoopConfig = ReturnType<typeof LoopNodeConfigSchema.parse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coerceArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).length === "number"
  ) {
    return Array.from(value as ArrayLike<unknown>);
  }
  return null;
}

function buildLoopContext(params: LoopContextParams): Record<string, unknown> {
  const base = isRecord(params.currentValue) ? params.currentValue : {};

  return {
    ...base,
    value: params.currentValue,
    item: params.item,
    index: params.index,
    iteration: params.iteration,
    lastOutput: params.lastOutput,
    results: params.results,
    errors: params.errors,
    initial: params.initialInput,
    initialInput: params.initialInput,
  };
}

function assertLoopConfig(config: {
  executionMode: string;
  type: string;
  collection?: string;
  condition?: string;
  times?: number;
  outputMode: string;
  aggregateExpression?: string;
}): void {
  if (config.executionMode !== "sequential") {
    throw new Error(
      `Loop execution mode ${config.executionMode} is not supported`
    );
  }

  if (config.type === "forEach" && !config.collection?.trim()) {
    throw new Error("Loop collection expression is required");
  }

  if (config.type === "while" && !config.condition?.trim()) {
    throw new Error("Loop condition expression is required");
  }

  if (config.type === "times" && !(config.times && config.times > 0)) {
    throw new Error("Loop iteration count must be greater than zero");
  }

  if (
    config.outputMode === "aggregate" &&
    !config.aggregateExpression?.trim()
  ) {
    throw new Error("Loop aggregation expression is required");
  }
}

async function resolveResults(
  loopState: LoopState,
  claimCheck: ReturnType<typeof createDbClaimCheckStore>
): Promise<unknown[]> {
  if (loopState.resultRefs && loopState.resultRefs.length > 0) {
    const results: unknown[] = [];
    for (const ref of loopState.resultRefs) {
      const resolved = await resolvePayload(ref, claimCheck);
      results.push(resolved);
    }
    return results;
  }

  if (!loopState.resultsRef) {
    return [];
  }
  const resolved = await resolvePayload(loopState.resultsRef, claimCheck);
  return Array.isArray(resolved) ? resolved : [];
}

async function resolveErrors(
  loopState: LoopState,
  claimCheck: ReturnType<typeof createDbClaimCheckStore>
): Promise<LoopIterationError[]> {
  if (loopState.errorRefs && loopState.errorRefs.length > 0) {
    const errors: LoopIterationError[] = [];
    for (const ref of loopState.errorRefs) {
      const resolved = await resolvePayload(ref, claimCheck);
      errors.push(resolved as LoopIterationError);
    }
    return errors;
  }

  if (!loopState.errorsRef) {
    return [];
  }
  const resolved = await resolvePayload(loopState.errorsRef, claimCheck);
  return Array.isArray(resolved) ? (resolved as LoopIterationError[]) : [];
}

async function ensureCollection(params: {
  loopState: LoopState;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  collection: unknown[] | null;
}): Promise<unknown[]> {
  if (params.collection) {
    return params.collection;
  }
  const storedCollection = await resolvePayload(
    params.loopState.collectionRef,
    params.claimCheck
  );
  return Array.isArray(storedCollection) ? storedCollection : [];
}

async function initializeLoopState(params: {
  config: LoopConfig;
  resolvedInput: unknown;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  nodeId: string;
  startedAt: number;
}): Promise<{ loopState: LoopState; collection: unknown[] | null }> {
  const { config, resolvedInput, claimCheck, nodeId, startedAt } = params;
  const initialInputRef = await claimCheck.put(resolvedInput, {
    nodeId,
  });
  const loopState: LoopState = {
    nodeId,
    type: config.type,
    startedAt,
    iteration: 0,
    index: 0,
    initialInputRef,
  };
  let collection: unknown[] | null = null;

  if (config.type === "forEach") {
    const value = await evaluateExpression({
      expression: config.collection ?? "",
      language: "javascript",
      data: resolvedInput,
    });

    const items = coerceArray(value);
    if (!items) {
      throw new Error("Loop collection expression must return an array");
    }

    loopState.collectionRef = await claimCheck.put(items, { nodeId });
    loopState.collectionSize = items.length;
    collection = items;
  }

  return { loopState, collection };
}

async function appendResult(params: {
  loopState: LoopState;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  value: unknown;
  nodeId: string;
}): Promise<void> {
  const ref = await params.claimCheck.put(params.value, {
    nodeId: params.nodeId,
  });
  if (!params.loopState.resultRefs) {
    params.loopState.resultRefs = [];
  }
  params.loopState.resultRefs.push(ref);
}

async function appendError(params: {
  loopState: LoopState;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  error: LoopIterationError;
  nodeId: string;
}): Promise<void> {
  const ref = await params.claimCheck.put(params.error, {
    nodeId: params.nodeId,
  });
  if (!params.loopState.errorRefs) {
    params.loopState.errorRefs = [];
  }
  params.loopState.errorRefs.push(ref);
}

async function applyIterationUpdate(params: {
  loopState: LoopState;
  config: LoopConfig;
  resolvedInput: unknown;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  nodeId: string;
  iterationError?: LoopIterationError;
  collection: unknown[] | null;
}): Promise<{
  loopState: LoopState;
  collection: unknown[] | null;
  priorItem: unknown;
  priorIndex: number;
  priorIteration: number;
}> {
  const {
    loopState,
    config,
    resolvedInput,
    claimCheck,
    nodeId,
    iterationError,
  } = params;
  const priorIteration = loopState.iteration;
  const priorIndex = loopState.index;
  let priorItem: unknown = null;
  let collection = params.collection;

  if (loopState.type === "forEach") {
    collection = await ensureCollection({ loopState, claimCheck, collection });
    priorItem = collection[priorIndex];
  }

  if (iterationError) {
    if (config.errorHandling === "collect") {
      await appendError({
        loopState,
        claimCheck,
        nodeId,
        error: {
          ...iterationError,
          iteration: priorIteration,
          index: priorIndex,
        },
      });
    }
  } else {
    if (config.outputMode !== "lastOnly") {
      await appendResult({
        loopState,
        claimCheck,
        nodeId,
        value: resolvedInput,
      });
    }

    loopState.lastOutputRef = await claimCheck.put(resolvedInput, { nodeId });
  }

  loopState.iteration = priorIteration + 1;
  loopState.index = priorIndex + 1;

  return {
    loopState,
    collection,
    priorItem,
    priorIndex,
    priorIteration,
  };
}

async function evaluateBreakCondition(params: {
  config: LoopConfig;
  loopState: LoopState;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  resolvedInput: unknown;
  priorItem: unknown;
  priorIndex: number;
  priorIteration: number;
}): Promise<boolean> {
  const {
    config,
    loopState,
    claimCheck,
    resolvedInput,
    priorItem,
    priorIndex,
    priorIteration,
  } = params;

  if (!config.breakCondition?.trim()) {
    return false;
  }

  const initialInput = await resolvePayload(
    loopState.initialInputRef,
    claimCheck
  );
  const results =
    config.outputMode === "lastOnly"
      ? []
      : await resolveResults(loopState, claimCheck);
  const errors =
    config.errorHandling === "collect"
      ? await resolveErrors(loopState, claimCheck)
      : [];
  const context = buildLoopContext({
    currentValue: resolvedInput,
    initialInput,
    item: priorItem,
    index: priorIndex,
    iteration: priorIteration,
    lastOutput: resolvedInput,
    results,
    errors,
  });
  const result = await evaluateExpression({
    expression: config.breakCondition ?? "",
    language: "javascript",
    data: resolvedInput,
    context,
  });
  return Boolean(result);
}

async function selectForEachNext(params: {
  loopState: LoopState;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
  collection: unknown[] | null;
}): Promise<{
  branchId: "body" | "done";
  nextValue?: unknown;
  collection: unknown[] | null;
}> {
  const collection = await ensureCollection({
    loopState: params.loopState,
    claimCheck: params.claimCheck,
    collection: params.collection,
  });
  const count = params.loopState.collectionSize ?? collection.length;
  if (params.loopState.index >= count) {
    return { branchId: "done", collection };
  }
  return {
    branchId: "body",
    nextValue: collection[params.loopState.index],
    collection,
  };
}

async function selectTimesNext(params: {
  loopState: LoopState;
  config: LoopConfig;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
}): Promise<{ branchId: "body" | "done"; nextValue?: unknown }> {
  if (params.loopState.iteration >= (params.config.times ?? 0)) {
    return { branchId: "done" };
  }
  if (params.loopState.lastOutputRef) {
    const value = await resolvePayload(
      params.loopState.lastOutputRef,
      params.claimCheck
    );
    return { branchId: "body", nextValue: value };
  }
  const value = await resolvePayload(
    params.loopState.initialInputRef,
    params.claimCheck
  );
  return { branchId: "body", nextValue: value };
}

async function selectWhileNext(params: {
  loopState: LoopState;
  config: LoopConfig;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
}): Promise<{ branchId: "body" | "done"; nextValue?: unknown }> {
  const candidateValue = params.loopState.lastOutputRef
    ? await resolvePayload(params.loopState.lastOutputRef, params.claimCheck)
    : await resolvePayload(params.loopState.initialInputRef, params.claimCheck);
  const results =
    params.config.outputMode === "lastOnly"
      ? []
      : await resolveResults(params.loopState, params.claimCheck);
  const errors =
    params.config.errorHandling === "collect"
      ? await resolveErrors(params.loopState, params.claimCheck)
      : [];
  const context = buildLoopContext({
    currentValue: candidateValue,
    initialInput: await resolvePayload(
      params.loopState.initialInputRef,
      params.claimCheck
    ),
    item: null,
    index: params.loopState.iteration,
    iteration: params.loopState.iteration,
    lastOutput: candidateValue,
    results,
    errors,
  });
  const conditionResult = await evaluateExpression({
    expression: params.config.condition ?? "",
    language: "javascript",
    data: candidateValue,
    context,
  });
  if (!conditionResult) {
    return { branchId: "done" };
  }
  return { branchId: "body", nextValue: candidateValue };
}

async function resolveFinalValue(params: {
  loopState: LoopState;
  config: LoopConfig;
  claimCheck: ReturnType<typeof createDbClaimCheckStore>;
}): Promise<unknown> {
  const results = await resolveResults(params.loopState, params.claimCheck);
  const errors = await resolveErrors(params.loopState, params.claimCheck);

  if (params.config.outputMode === "lastOnly") {
    return params.loopState.lastOutputRef
      ? await resolvePayload(params.loopState.lastOutputRef, params.claimCheck)
      : undefined;
  }

  if (params.config.outputMode === "aggregate") {
    return await evaluateExpression({
      expression: params.config.aggregateExpression ?? "",
      language: "javascript",
      data: results,
      context: { results, errors },
    });
  }

  return results;
}

export function createExecuteLoopNodeActivity(
  deps: ExecuteLoopNodeDependencies
) {
  return async function executeLoopNodeActivity(
    input: ExecuteLoopNodeInput
  ): Promise<ExecuteLoopNodeOutput> {
    const startedAt = Date.now();
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const resolvedInput = isExecutionDataRef(input.input)
      ? await resolvePayload(input.input, claimCheck)
      : input.input;
    const storedInput = isExecutionDataRef(input.input)
      ? input.input
      : await storePayload(
          resolvedInput,
          claimCheck,
          { maxInlineBytes: deps.maxInlineBytes },
          { nodeId: input.node.id }
        );

    const step = await createAgentCanvasExecutionStep(deps.db, input.teamId, {
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: "RUNNING",
      input: storedInput,
      startedAt: new Date(startedAt),
    });

    Context.current().heartbeat({
      stage: "initialized",
      nodeId: input.node.id,
    });

    try {
      const config = LoopNodeConfigSchema.parse(
        resolveNodeConfig(input.node.data)
      );
      assertLoopConfig(config);

      let loopState = input.loopState;
      let collection: unknown[] | null = null;

      if (!loopState) {
        const initialized = await initializeLoopState({
          config,
          resolvedInput,
          claimCheck,
          nodeId: input.node.id,
          startedAt,
        });
        loopState = initialized.loopState;
        collection = initialized.collection;
      }

      const hasIteration = Boolean(input.loopState);
      let priorItem: unknown = null;
      let priorIndex = loopState.index;
      let priorIteration = loopState.iteration;

      if (hasIteration) {
        const updated = await applyIterationUpdate({
          loopState,
          config,
          resolvedInput,
          claimCheck,
          nodeId: input.node.id,
          iterationError: input.iterationError,
          collection,
        });
        loopState = updated.loopState;
        collection = updated.collection;
        priorItem = updated.priorItem;
        priorIndex = updated.priorIndex;
        priorIteration = updated.priorIteration;

        Context.current().heartbeat({
          stage: "iteration_updated",
          iteration: loopState.iteration,
          nodeId: input.node.id,
        });
      }

      if (loopState.iteration >= SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS) {
        throw new Error(
          `Loop reached hard iteration ceiling (${SAFETY_CEILINGS.HARD_MAX_LOOP_ITERATIONS})`
        );
      }

      if (
        Date.now() - loopState.startedAt >
        SAFETY_CEILINGS.HARD_MAX_LOOP_DURATION_MS
      ) {
        throw new Error(
          `Loop reached hard duration ceiling (${SAFETY_CEILINGS.HARD_MAX_LOOP_DURATION_MS}ms)`
        );
      }

      if (
        config.timeoutMs !== undefined &&
        Date.now() - loopState.startedAt > config.timeoutMs
      ) {
        throw new Error("Loop execution timed out");
      }

      let branchId: "body" | "done" = "body";
      let nextValue: unknown;

      if (hasIteration && !input.iterationError) {
        const shouldBreak = await evaluateBreakCondition({
          config,
          loopState,
          claimCheck,
          resolvedInput,
          priorItem,
          priorIndex,
          priorIteration,
        });
        if (shouldBreak) {
          branchId = "done";
        }
      }

      if (branchId === "body") {
        Context.current().heartbeat({
          stage: "selecting_next",
          type: config.type,
          iteration: loopState.iteration,
          nodeId: input.node.id,
        });

        if (config.type === "forEach") {
          const selected = await selectForEachNext({
            loopState,
            claimCheck,
            collection,
          });
          branchId = selected.branchId;
          nextValue = selected.nextValue;
          collection = selected.collection;
        } else if (config.type === "times") {
          const selected = await selectTimesNext({
            loopState,
            config,
            claimCheck,
          });
          branchId = selected.branchId;
          nextValue = selected.nextValue;
        } else {
          const selected = await selectWhileNext({
            loopState,
            config,
            claimCheck,
          });
          branchId = selected.branchId;
          nextValue = selected.nextValue;
        }
      }

      if (branchId === "done") {
        const finalValue = await resolveFinalValue({
          loopState,
          config,
          claimCheck,
        });

        if (config.errorHandling === "collect") {
          const errors = await resolveErrors(loopState, claimCheck);
          nextValue = { result: finalValue, errors };
        } else {
          nextValue = finalValue;
        }
      } else if (loopState.iteration >= config.maxIterations) {
        throw new Error(
          `Loop exceeded max iterations (${config.maxIterations})`
        );
      }

      const storedOutput = await storePayload(
        nextValue,
        claimCheck,
        { maxInlineBytes: deps.maxInlineBytes },
        { nodeId: input.node.id }
      );
      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "COMPLETED",
        output: storedOutput,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      return {
        branchId,
        output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
        outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
        inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
        loopState,
        startedAt,
        completedAt,
        latencyMs,
      };
    } catch (error) {
      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "FAILED",
        error: message,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      throw error;
    }
  };
}

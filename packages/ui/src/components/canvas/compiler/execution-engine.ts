import type {
  CompiledAgentConfig,
  CompiledNode,
} from "./agent-config-compiler";

export interface ExecutionContext {
  agentId: string;
  sessionId: string;
  userId: string;
  teamId: string;
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, unknown>;
}

export interface NodeExecutor {
  type: string;
  execute: (
    node: CompiledNode,
    inputs: Record<string, unknown>,
    ctx: ExecutionContext
  ) => Promise<Record<string, unknown>>;
}

export interface ExecutionEvent {
  type: "node_start" | "node_complete" | "node_error" | "execution_complete";
  nodeId?: string;
  data?: unknown;
  error?: Error;
  timestamp: number;
}

export type ExecutionEventHandler = (event: ExecutionEvent) => void;

export class AgentExecutionEngine {
  private readonly executors: Map<string, NodeExecutor> = new Map();
  private readonly eventHandlers: ExecutionEventHandler[] = [];

  registerExecutor(executor: NodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  onEvent(handler: ExecutionEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private emit(event: ExecutionEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  async execute(
    config: CompiledAgentConfig,
    initialInputs: Record<string, unknown>,
    ctx: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const nodeMap = new Map(config.nodes.map((n) => [n.id, n]));
    const edgesBySource = new Map<string, (typeof config.edges)[number][]>();

    for (const edge of config.edges) {
      const edges = edgesBySource.get(edge.source) ?? [];
      edges.push(edge);
      edgesBySource.set(edge.source, edges);
    }

    const executed = new Set<string>();
    const queue: string[] = [config.entrypoint];

    ctx.variables.set("input", initialInputs);

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || executed.has(nodeId)) {
        continue;
      }

      const node = nodeMap.get(nodeId);
      if (!node) {
        continue;
      }

      this.emit({
        type: "node_start",
        nodeId,
        timestamp: Date.now(),
      });

      try {
        const inputs = this.gatherInputs(ctx);
        const executor = this.executors.get(node.type);

        if (!executor) {
          throw new Error(`No executor registered for node type: ${node.type}`);
        }

        const outputs = await executor.execute(node, inputs, ctx);
        ctx.nodeOutputs.set(nodeId, outputs);

        this.emit({
          type: "node_complete",
          nodeId,
          data: outputs,
          timestamp: Date.now(),
        });

        executed.add(nodeId);

        this.enqueueNextNodes({
          nodeId,
          node,
          outputs,
          edgesBySource,
          executed,
          queue,
        });
      } catch (error) {
        this.emit({
          type: "node_error",
          nodeId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
        });
        throw error;
      }
    }

    const exitOutputs = this.collectExitOutputs(config.exitpoints, ctx);

    this.emit({
      type: "execution_complete",
      data: exitOutputs,
      timestamp: Date.now(),
    });

    return exitOutputs;
  }

  private enqueueNextNodes(options: {
    nodeId: string;
    node: CompiledNode;
    outputs: Record<string, unknown>;
    edgesBySource: Map<string, { target: string; sourceHandle?: string }[]>;
    executed: Set<string>;
    queue: string[];
  }): void {
    const { nodeId, node, outputs, edgesBySource, executed, queue } = options;
    const outEdges = edgesBySource.get(nodeId) ?? [];

    for (const edge of outEdges) {
      if (node.type === "condition") {
        const shouldFollow = this.evaluateConditionEdge(edge, outputs);
        if (shouldFollow && !executed.has(edge.target)) {
          queue.push(edge.target);
        }
      } else if (!executed.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  private collectExitOutputs(
    exitpoints: string[],
    ctx: ExecutionContext
  ): Record<string, unknown> {
    const exitOutputs: Record<string, unknown> = {};

    for (const exitId of exitpoints) {
      const output = ctx.nodeOutputs.get(exitId);
      if (output && typeof output === "object" && output !== null) {
        Object.assign(exitOutputs, output);
      }
    }

    return exitOutputs;
  }

  private gatherInputs(ctx: ExecutionContext): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    for (const [, outputs] of ctx.nodeOutputs) {
      if (typeof outputs === "object" && outputs !== null) {
        Object.assign(inputs, outputs);
      }
    }

    inputs._variables = Object.fromEntries(ctx.variables);

    return inputs;
  }

  private evaluateConditionEdge(
    edge: { sourceHandle?: string },
    outputs: Record<string, unknown>
  ): boolean {
    const result = outputs.result as boolean | undefined;
    const isTrue = edge.sourceHandle?.includes("true");
    const isFalse = edge.sourceHandle?.includes("false");

    if (isTrue) {
      return result === true;
    }
    if (isFalse) {
      return result === false;
    }
    return true;
  }
}

function createMapExpression(
  expression: string
): (item: unknown, index: number) => unknown {
  return new Function("item", "index", `return ${expression}`) as (
    item: unknown,
    index: number
  ) => unknown;
}

function createFilterExpression(
  expression: string
): (item: unknown, index: number) => boolean {
  return new Function("item", "index", `return ${expression}`) as (
    item: unknown,
    index: number
  ) => boolean;
}

function createConditionExpression(
  expression: string
): (data: unknown) => boolean {
  return new Function("data", `return ${expression}`) as (
    data: unknown
  ) => boolean;
}

export const defaultExecutors: NodeExecutor[] = [
  {
    type: "start",
    execute: (_node, inputs) => Promise.resolve(inputs),
  },
  {
    type: "end",
    execute: (_node, inputs) => Promise.resolve(inputs),
  },
  {
    type: "map",
    execute: (node, inputs) => {
      const items = inputs.items as unknown[] | undefined;
      const expression = node.config.expression as string;

      if (!(items && Array.isArray(items))) {
        return Promise.resolve({ items: [] });
      }

      const mapFn = createMapExpression(expression);
      const mapped = items.map((item, idx) => mapFn(item, idx));

      return Promise.resolve({ items: mapped });
    },
  },
  {
    type: "filter",
    execute: (node, inputs) => {
      const items = inputs.items as unknown[] | undefined;
      const expression = node.config.expression as string;

      if (!(items && Array.isArray(items))) {
        return Promise.resolve({ items: [] });
      }

      const filterFn = createFilterExpression(expression);
      const filtered = items.filter((item, idx) => filterFn(item, idx));

      return Promise.resolve({ items: filtered });
    },
  },
  {
    type: "condition",
    execute: (node, inputs) => {
      const expression = node.config.expression as string;
      const conditionFn = createConditionExpression(expression);
      const result = conditionFn(inputs);
      return Promise.resolve({ result: Boolean(result) });
    },
  },
  {
    type: "template",
    execute: (node, inputs) => {
      const template = node.config.template as string;
      const data = inputs as Record<string, unknown>;

      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
        String(data[key] ?? "")
      );

      return Promise.resolve({ text: rendered });
    },
  },
];

import { getMetricsCollector, type MetricsCollector } from "./metrics";
import { DuckDBApiError, DuckDBErrorCodes, type QueryResult } from "./types";

export interface QueuedQuery {
  id: string;
  documentId: string;
  sql: string;
  viewName: string;
  teamId: string;
  priority: number;
  createdAt: number;
  timeoutMs: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  defaultTimeoutMs: number;
  priorityLevels: number;
}

export interface QueryQueueInstance {
  enqueue(query: Omit<QueuedQuery, "id" | "createdAt">): Promise<string>;
  cancel(queryId: string): boolean;
  getPosition(queryId: string): number;
  getQueueSize(): number;
  getActiveCount(): number;
  drain(): Promise<void>;
}

interface PendingQuery extends QueuedQuery {
  resolve: (result: QueryResult) => void;
  reject: (error: Error) => void;
}

type QueryExecutor = (
  documentId: string,
  sql: string,
  viewName: string,
  options: { timeoutMs: number }
) => Promise<QueryResult>;

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 2,
  maxQueueSize: 100,
  defaultTimeoutMs: 30_000,
  priorityLevels: 3,
};

export function createQueryQueue(
  executor: QueryExecutor,
  config: Partial<QueueConfig> = {},
  metrics?: MetricsCollector
): QueryQueueInstance {
  const queueConfig: QueueConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };
  const metricsCollector = metrics ?? getMetricsCollector();

  const pendingQueries = new Map<string, PendingQuery>();
  const priorityQueues: string[][] = Array.from(
    { length: queueConfig.priorityLevels },
    () => []
  );

  let activeCount = 0;
  let queryCounter = 0;
  let draining = false;

  function generateId(): string {
    queryCounter += 1;
    return `query_${Date.now()}_${queryCounter}`;
  }

  function getNextQuery(): PendingQuery | null {
    for (const queue of priorityQueues) {
      while (queue.length > 0) {
        const id = queue.shift();
        if (id) {
          const query = pendingQueries.get(id);
          if (query) {
            return query;
          }
        }
      }
    }
    return null;
  }

  async function processNext(): Promise<void> {
    if (draining || activeCount >= queueConfig.maxConcurrent) {
      return;
    }

    const query = getNextQuery();
    if (!query) {
      return;
    }

    activeCount += 1;
    metricsCollector.setQueueDepth(getTotalQueueSize());

    const startTime = Date.now();

    try {
      const result = await executor(
        query.documentId,
        query.sql,
        query.viewName,
        {
          timeoutMs: query.timeoutMs,
        }
      );

      const elapsed = Date.now() - startTime;
      metricsCollector.recordQuery(
        { teamId: query.teamId, operation: "queue_execute", status: "success" },
        elapsed
      );

      query.resolve(result);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      metricsCollector.recordQuery(
        { teamId: query.teamId, operation: "queue_execute", status: "error" },
        elapsed
      );

      query.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      pendingQueries.delete(query.id);
      activeCount -= 1;
      metricsCollector.setQueueDepth(getTotalQueueSize());

      setImmediate(processNext);
    }
  }

  function getTotalQueueSize(): number {
    let total = 0;
    for (const queue of priorityQueues) {
      total += queue.length;
    }
    return total;
  }

  function enqueue(
    query: Omit<QueuedQuery, "id" | "createdAt">
  ): Promise<string> {
    if (draining) {
      throw new DuckDBApiError({
        message: "Queue is draining, not accepting new queries",
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: true,
      });
    }

    if (getTotalQueueSize() >= queueConfig.maxQueueSize) {
      throw new DuckDBApiError({
        message: "Query queue is full",
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: true,
        retryAfter: 5,
      });
    }

    const id = generateId();
    const priority = Math.min(
      Math.max(0, query.priority),
      queueConfig.priorityLevels - 1
    );

    return new Promise((resolve, reject) => {
      const pendingQuery: PendingQuery = {
        ...query,
        id,
        createdAt: Date.now(),
        timeoutMs: query.timeoutMs ?? queueConfig.defaultTimeoutMs,
        resolve: (result: QueryResult) => {
          resolve(id);
          return result;
        },
        reject: (error: Error) => {
          reject(error);
        },
      };

      pendingQueries.set(id, pendingQuery);
      const queue = priorityQueues[priority];
      if (queue) {
        queue.push(id);
      }
      metricsCollector.setQueueDepth(getTotalQueueSize());

      setImmediate(processNext);
    });
  }

  function cancel(queryId: string): boolean {
    const query = pendingQueries.get(queryId);
    if (!query) {
      return false;
    }

    pendingQueries.delete(queryId);

    for (const queue of priorityQueues) {
      const index = queue.indexOf(queryId);
      if (index !== -1) {
        queue.splice(index, 1);
        break;
      }
    }

    query.reject(
      new DuckDBApiError({
        message: "Query cancelled",
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      })
    );

    metricsCollector.setQueueDepth(getTotalQueueSize());
    return true;
  }

  function getPosition(queryId: string): number {
    let position = 0;
    for (const queue of priorityQueues) {
      for (const id of queue) {
        if (id === queryId) {
          return position;
        }
        if (pendingQueries.has(id)) {
          position += 1;
        }
      }
    }
    return -1;
  }

  function getQueueSize(): number {
    return getTotalQueueSize();
  }

  function getActiveCount(): number {
    return activeCount;
  }

  async function drain(): Promise<void> {
    draining = true;

    for (const [id, query] of pendingQueries) {
      query.reject(
        new DuckDBApiError({
          message: "Queue is draining",
          code: DuckDBErrorCodes.INTERNAL_ERROR,
          retryable: true,
        })
      );
      pendingQueries.delete(id);
    }

    for (const queue of priorityQueues) {
      queue.length = 0;
    }

    while (activeCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    draining = false;
    metricsCollector.setQueueDepth(0);
  }

  return {
    enqueue,
    cancel,
    getPosition,
    getQueueSize,
    getActiveCount,
    drain,
  };
}

export type QueryQueue = ReturnType<typeof createQueryQueue>;

import type { Database } from "bun:sqlite";
import type {
  TaskDefinition,
  TaskHandler,
  TaskStatus,
} from "@openplane/types/edge/scheduler";
import {
  calculateBackoffMs,
  RetryPolicySchema,
} from "@openplane/types/edge/scheduler";
import { nextRun } from "./cron";
import { EDGE_DEAD_LETTER_DDL, EDGE_TASKS_DDL } from "./schema";

interface EnqueueOptions {
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: number;
  retryPolicy?: Record<string, unknown>;
}

interface DeadLetterItem {
  id: string;
  taskId: string;
  name: string;
  payload: string | null;
  error: string | null;
  attempts: number | null;
  failedAt: number;
}

export class EdgeTaskScheduler {
  private readonly db: Database;
  private readonly handlers = new Map<string, TaskHandler>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(db: Database) {
    this.db = db;
    this.db.exec(EDGE_TASKS_DDL);
    this.db.exec(EDGE_DEAD_LETTER_DDL);
  }

  enqueue(
    name: string,
    payload: Record<string, unknown> = {},
    options: EnqueueOptions = {}
  ): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db
      .query(
        `INSERT INTO edge_tasks (id, name, payload, status, priority, retry_policy, max_attempts, scheduled_at, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        JSON.stringify(payload),
        options.priority ?? 2,
        JSON.stringify(options.retryPolicy ?? {}),
        options.maxAttempts ?? 3,
        options.scheduledAt ?? null,
        now,
        now
      );

    return id;
  }

  dequeue(): TaskDefinition | null {
    const now = Date.now();
    const row = this.db
      .query<TaskRow, [number]>(
        `SELECT * FROM edge_tasks
         WHERE status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= ?)
         ORDER BY priority ASC, created_at ASC
         LIMIT 1`
      )
      .get(now);

    if (!row) {
      return null;
    }

    this.db
      .query(
        `UPDATE edge_tasks SET status = 'running', started_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(now, now, row.id);

    return rowToTask({ ...row, status: "running", started_at: now });
  }

  complete(taskId: string): void {
    const now = Date.now();
    const row = this.db
      .query<TaskRow, [string]>("SELECT * FROM edge_tasks WHERE id = ?")
      .get(taskId);

    if (!row) {
      return;
    }

    this.db
      .query(
        `UPDATE edge_tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(now, now, taskId);

    if (row.cron_expression) {
      const next = nextRun(row.cron_expression);
      this.enqueue(row.name, JSON.parse(row.payload || "{}"), {
        priority: row.priority,
        maxAttempts: row.max_attempts,
        scheduledAt: next.getTime(),
        retryPolicy: JSON.parse(row.retry_policy || "{}"),
      });
    }
  }

  fail(taskId: string, error: string): void {
    const now = Date.now();
    const row = this.db
      .query<TaskRow, [string]>("SELECT * FROM edge_tasks WHERE id = ?")
      .get(taskId);

    if (!row) {
      return;
    }

    const attempts = row.attempts + 1;

    if (attempts >= row.max_attempts) {
      this.db
        .query(
          `UPDATE edge_tasks SET status = 'dead_letter', attempts = ?, failed_at = ?, last_error = ?, updated_at = ? WHERE id = ?`
        )
        .run(attempts, now, error, now, taskId);

      this.db
        .query(
          `INSERT INTO edge_dead_letter (id, task_id, name, payload, error, attempts, failed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          crypto.randomUUID(),
          taskId,
          row.name,
          row.payload,
          error,
          attempts,
          now
        );
    } else {
      const retryPolicy = RetryPolicySchema.parse(
        JSON.parse(row.retry_policy || "{}")
      );
      const backoffMs = calculateBackoffMs(attempts, retryPolicy);
      const scheduledAt = now + backoffMs;

      this.db
        .query(
          `UPDATE edge_tasks SET status = 'pending', attempts = ?, scheduled_at = ?, last_error = ?, failed_at = ?, updated_at = ? WHERE id = ?`
        )
        .run(attempts, scheduledAt, error, now, now, taskId);
    }
  }

  schedule(
    name: string,
    cronExpression: string,
    payload: Record<string, unknown> = {}
  ): string {
    const next = nextRun(cronExpression);
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db
      .query(
        `INSERT INTO edge_tasks (id, name, payload, status, priority, retry_policy, max_attempts, scheduled_at, cron_expression, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 2, '{}', 3, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        JSON.stringify(payload),
        next.getTime(),
        cronExpression,
        now,
        now
      );

    return id;
  }

  registerHandler(name: string, handler: TaskHandler): void {
    this.handlers.set(name, handler);
  }

  start(pollIntervalMs = 1000): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => {
      this.tick().then(
        () => undefined,
        () => undefined
      );
    }, pollIntervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getTask(id: string): TaskDefinition | null {
    const row = this.db
      .query<TaskRow, [string]>("SELECT * FROM edge_tasks WHERE id = ?")
      .get(id);

    if (!row) {
      return null;
    }

    return rowToTask(row);
  }

  listTasks(status?: TaskStatus): TaskDefinition[] {
    if (status) {
      const rows = this.db
        .query<TaskRow, [string]>(
          "SELECT * FROM edge_tasks WHERE status = ? ORDER BY created_at DESC"
        )
        .all(status);
      return rows.map(rowToTask);
    }

    const rows = this.db
      .query<TaskRow, []>("SELECT * FROM edge_tasks ORDER BY created_at DESC")
      .all();
    return rows.map(rowToTask);
  }

  getDeadLetterQueue(): DeadLetterItem[] {
    return this.db
      .query<DeadLetterItem, []>(
        "SELECT id, task_id as taskId, name, payload, error, attempts, failed_at as failedAt FROM edge_dead_letter ORDER BY failed_at DESC"
      )
      .all();
  }

  private async tick(): Promise<void> {
    const task = this.dequeue();
    if (!task) {
      return;
    }

    const handler = this.handlers.get(task.name);
    if (!handler) {
      this.fail(task.id, `No handler registered for task: ${task.name}`);
      return;
    }

    try {
      await handler(task.payload);
      this.complete(task.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.fail(task.id, message);
    }
  }
}

interface TaskRow {
  id: string;
  name: string;
  payload: string;
  status: string;
  priority: number;
  retry_policy: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  failed_at: number | null;
  last_error: string | null;
  cron_expression: string | null;
  created_at: number;
  updated_at: number;
}

function rowToTask(row: TaskRow): TaskDefinition {
  return {
    id: row.id,
    name: row.name,
    payload: JSON.parse(row.payload || "{}"),
    status: row.status as TaskDefinition["status"],
    priority: priorityFromNumber(row.priority),
    retryPolicy: RetryPolicySchema.parse(JSON.parse(row.retry_policy || "{}")),
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    scheduledAt: row.scheduled_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    failedAt: row.failed_at ?? undefined,
    lastError: row.last_error ?? undefined,
    cronExpression: row.cron_expression ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function priorityFromNumber(n: number): TaskDefinition["priority"] {
  switch (n) {
    case 0:
      return "critical";
    case 1:
      return "high";
    case 3:
      return "low";
    default:
      return "normal";
  }
}

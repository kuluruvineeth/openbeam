import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EdgeTaskScheduler } from "../scheduler";

describe("EdgeTaskScheduler", () => {
  let db: Database;
  let scheduler: EdgeTaskScheduler;

  beforeEach(() => {
    db = new Database(":memory:");
    scheduler = new EdgeTaskScheduler(db);
  });

  afterEach(() => {
    scheduler.stop();
    db.close();
  });

  test("enqueue creates a task and returns id", () => {
    const id = scheduler.enqueue("test-task", { key: "value" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("getTask returns enqueued task", () => {
    const id = scheduler.enqueue("test-task", { key: "value" });
    const task = scheduler.getTask(id);
    expect(task).not.toBeNull();
    expect(task?.name).toBe("test-task");
    expect(task?.status).toBe("pending");
    expect(task?.payload).toEqual({ key: "value" });
  });

  test("getTask returns null for missing id", () => {
    expect(scheduler.getTask("nonexistent")).toBeNull();
  });

  test("dequeue returns highest priority pending task", () => {
    scheduler.enqueue("low", {}, { priority: 3 });
    scheduler.enqueue("high", {}, { priority: 0 });
    scheduler.enqueue("normal", {}, { priority: 2 });

    const task = scheduler.dequeue();
    expect(task).not.toBeNull();
    expect(task?.name).toBe("high");
    expect(task?.status).toBe("running");
  });

  test("dequeue returns null when no tasks available", () => {
    expect(scheduler.dequeue()).toBeNull();
  });

  test("dequeue skips scheduled-for-future tasks", () => {
    scheduler.enqueue("future", {}, { scheduledAt: Date.now() + 60_000 });
    expect(scheduler.dequeue()).toBeNull();
  });

  test("dequeue picks scheduled-for-now tasks", () => {
    scheduler.enqueue("ready", {}, { scheduledAt: Date.now() - 1000 });
    const task = scheduler.dequeue();
    expect(task).not.toBeNull();
    expect(task?.name).toBe("ready");
  });

  test("complete marks task as completed", () => {
    const id = scheduler.enqueue("task");
    scheduler.dequeue();
    scheduler.complete(id);

    const task = scheduler.getTask(id);
    expect(task?.status).toBe("completed");
    expect(task?.completedAt).toBeDefined();
  });

  test("fail increments attempts and reschedules", () => {
    const id = scheduler.enqueue("task", {}, { maxAttempts: 3 });
    scheduler.dequeue();
    scheduler.fail(id, "something broke");

    const task = scheduler.getTask(id);
    expect(task?.status).toBe("pending");
    expect(task?.attempts).toBe(1);
    expect(task?.lastError).toBe("something broke");
    expect(task?.scheduledAt).toBeDefined();
  });

  test("fail moves to dead letter after max attempts", () => {
    const id = scheduler.enqueue("task", {}, { maxAttempts: 1 });
    scheduler.dequeue();
    scheduler.fail(id, "fatal error");

    const task = scheduler.getTask(id);
    expect(task?.status).toBe("dead_letter");

    const dlq = scheduler.getDeadLetterQueue();
    expect(dlq.length).toBe(1);
    expect(dlq[0].name).toBe("task");
    expect(dlq[0].error).toBe("fatal error");
  });

  test("listTasks returns all tasks", () => {
    scheduler.enqueue("a");
    scheduler.enqueue("b");
    scheduler.enqueue("c");

    const tasks = scheduler.listTasks();
    expect(tasks.length).toBe(3);
  });

  test("listTasks filters by status", () => {
    scheduler.enqueue("a");
    scheduler.enqueue("b");
    scheduler.enqueue("c");

    const task = scheduler.dequeue();
    expect(task).not.toBeNull();
    if (task) {
      scheduler.complete(task.id);
    }

    const pending = scheduler.listTasks("pending");
    expect(pending.length).toBe(2);

    const completed = scheduler.listTasks("completed");
    expect(completed.length).toBe(1);
  });

  test("registerHandler and start processes tasks", async () => {
    const results: string[] = [];

    scheduler.registerHandler("process", (payload) => {
      results.push(payload.item as string);
      return Promise.resolve();
    });

    scheduler.enqueue("process", { item: "first" });
    scheduler.enqueue("process", { item: "second" });

    scheduler.start(10);

    await new Promise((resolve) => setTimeout(resolve, 100));
    scheduler.stop();

    expect(results).toContain("first");
    expect(results).toContain("second");
  });

  test("handler failure increments attempts", async () => {
    scheduler.registerHandler("fail-task", () =>
      Promise.reject(new Error("handler error"))
    );

    const id = scheduler.enqueue("fail-task", {}, { maxAttempts: 2 });
    scheduler.start(10);

    await new Promise((resolve) => setTimeout(resolve, 200));
    scheduler.stop();

    const task = scheduler.getTask(id);
    expect(task?.attempts).toBeGreaterThanOrEqual(1);
  });

  test("start is idempotent", () => {
    scheduler.start(100);
    scheduler.start(100);
    scheduler.stop();
  });

  test("stop when not started is no-op", () => {
    scheduler.stop();
  });

  test("schedule creates cron-based task", () => {
    const id = scheduler.schedule("cron-task", "0 * * * *", { x: 1 });
    const task = scheduler.getTask(id);
    expect(task).not.toBeNull();
    expect(task?.cronExpression).toBe("0 * * * *");
    expect(task?.scheduledAt).toBeDefined();
  });

  test("complete reschedules cron task", () => {
    const id = scheduler.schedule("cron-task", "*/5 * * * *");

    const row = db
      .query<{ id: string }, []>(
        "SELECT id FROM edge_tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
      )
      .get();
    expect(row).not.toBeNull();

    db.query(
      "UPDATE edge_tasks SET status = 'running', started_at = ? WHERE id = ?"
    ).run(Date.now(), id);

    scheduler.complete(id);

    const tasks = scheduler.listTasks("pending");
    expect(tasks.length).toBe(1);
    expect(tasks[0].name).toBe("cron-task");
  });

  test("getDeadLetterQueue returns empty initially", () => {
    expect(scheduler.getDeadLetterQueue()).toEqual([]);
  });

  test("enqueue with custom retry policy", () => {
    const id = scheduler.enqueue(
      "task",
      {},
      {
        retryPolicy: { maxAttempts: 5, baseDelayMs: 2000 },
      }
    );
    const task = scheduler.getTask(id);
    expect(task).not.toBeNull();
  });

  test("no handler fails task gracefully", async () => {
    scheduler.enqueue("unhandled-task");
    scheduler.start(10);

    await new Promise((resolve) => setTimeout(resolve, 100));
    scheduler.stop();

    const tasks = scheduler.listTasks();
    const task = tasks.find((t) => t.name === "unhandled-task");
    expect(task).toBeDefined();
    expect(task?.lastError).toContain("No handler registered");
  });

  test("priority ordering: critical > high > normal > low", () => {
    scheduler.enqueue("low", {}, { priority: 3 });
    scheduler.enqueue("normal", {}, { priority: 2 });
    scheduler.enqueue("critical", {}, { priority: 0 });
    scheduler.enqueue("high", {}, { priority: 1 });

    const names: string[] = [];
    let task = scheduler.dequeue();
    while (task) {
      names.push(task.name);
      task = scheduler.dequeue();
    }

    expect(names).toEqual(["critical", "high", "normal", "low"]);
  });

  test("fail on non-existent task is no-op", () => {
    scheduler.fail("nonexistent", "error");
  });

  test("complete on non-existent task is no-op", () => {
    scheduler.complete("nonexistent");
  });

  test("multiple failures with backoff increase scheduled_at", () => {
    const id = scheduler.enqueue("task", {}, { maxAttempts: 5 });

    scheduler.dequeue();
    scheduler.fail(id, "err1");
    const task1 = scheduler.getTask(id);

    scheduler.dequeue();
    scheduler.fail(id, "err2");
    const task2 = scheduler.getTask(id);

    expect(task2?.scheduledAt ?? 0).toBeGreaterThanOrEqual(
      task1?.scheduledAt ?? 0
    );
  });
});

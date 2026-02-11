import { describe, expect, it } from "bun:test";
import { createMockEvent } from "../../__tests__/test-helpers";
import {
  groupTasksByStatus,
  mergeTasksWithEvents,
  moveTaskToColumn,
  reorderTaskInColumn,
  type TaskItem,
} from "../../lib/task-board-utils";

function createTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    title: "Test task",
    description: "A task for testing",
    status: "INBOX",
    priority: "P1",
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("groupTasksByStatus", () => {
  it("groups tasks into correct status columns", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1", status: "INBOX" }),
      createTask({ id: "t2", status: "IN_PROGRESS" }),
      createTask({ id: "t3", status: "DONE" }),
      createTask({ id: "t4", status: "INBOX" }),
      createTask({ id: "t5", status: "REVIEW" }),
    ];

    const columns = groupTasksByStatus(tasks);

    expect(columns).toHaveLength(5);
    expect(columns[0].status).toBe("INBOX");
    expect(columns[0].tasks).toHaveLength(2);
    expect(columns[1].status).toBe("ASSIGNED");
    expect(columns[1].tasks).toHaveLength(0);
    expect(columns[2].status).toBe("IN_PROGRESS");
    expect(columns[2].tasks).toHaveLength(1);
    expect(columns[3].status).toBe("REVIEW");
    expect(columns[3].tasks).toHaveLength(1);
    expect(columns[4].status).toBe("DONE");
    expect(columns[4].tasks).toHaveLength(1);
  });

  it("returns empty columns for empty input", () => {
    const columns = groupTasksByStatus([]);

    expect(columns).toHaveLength(5);
    for (const col of columns) {
      expect(col.tasks).toHaveLength(0);
    }
  });

  it("puts all same-status tasks in one column", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1", status: "IN_PROGRESS", priority: "P0" }),
      createTask({ id: "t2", status: "IN_PROGRESS", priority: "P2" }),
      createTask({ id: "t3", status: "IN_PROGRESS", priority: "P1" }),
    ];

    const columns = groupTasksByStatus(tasks);
    const inProgress = columns.find((c) => c.status === "IN_PROGRESS");
    if (!inProgress) {
      throw new Error("Expected IN_PROGRESS column");
    }

    expect(inProgress.tasks).toHaveLength(3);
    expect(inProgress.tasks[0].id).toBe("t1");
    expect(inProgress.tasks[1].id).toBe("t3");
    expect(inProgress.tasks[2].id).toBe("t2");
  });

  it("sorts tasks by priority then by createdAt within columns", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1", status: "INBOX", priority: "P2", createdAt: 100 }),
      createTask({ id: "t2", status: "INBOX", priority: "P0", createdAt: 200 }),
      createTask({ id: "t3", status: "INBOX", priority: "P2", createdAt: 50 }),
    ];

    const columns = groupTasksByStatus(tasks);
    const inbox = columns.find((c) => c.status === "INBOX");
    if (!inbox) {
      throw new Error("Expected INBOX column");
    }

    expect(inbox.tasks[0].id).toBe("t2");
    expect(inbox.tasks[1].id).toBe("t3");
    expect(inbox.tasks[2].id).toBe("t1");
  });
});

describe("reorderTaskInColumn", () => {
  it("moves task from index 0 to index 2", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1" }),
      createTask({ id: "t2" }),
      createTask({ id: "t3" }),
    ];

    const result = reorderTaskInColumn(tasks, "t1", 2);

    expect(result[0].id).toBe("t2");
    expect(result[1].id).toBe("t3");
    expect(result[2].id).toBe("t1");
  });

  it("moves task from index 2 to index 0", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1" }),
      createTask({ id: "t2" }),
      createTask({ id: "t3" }),
    ];

    const result = reorderTaskInColumn(tasks, "t3", 0);

    expect(result[0].id).toBe("t3");
    expect(result[1].id).toBe("t1");
    expect(result[2].id).toBe("t2");
  });

  it("returns unchanged array when task ID is not found", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1" }),
      createTask({ id: "t2" }),
    ];

    const result = reorderTaskInColumn(tasks, "nonexistent", 0);

    expect(result).toEqual(tasks);
  });

  it("handles single-item column", () => {
    const tasks: TaskItem[] = [createTask({ id: "t1" })];

    const result = reorderTaskInColumn(tasks, "t1", 0);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });
});

describe("moveTaskToColumn", () => {
  it("moves task to target status", () => {
    const task = createTask({ id: "t1", status: "INBOX" });

    const result = moveTaskToColumn(task, "IN_PROGRESS");

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.id).toBe("t1");
  });

  it("preserves other task fields", () => {
    const task = createTask({
      id: "t1",
      title: "Important task",
      priority: "P0",
      assignedAgentId: "agent-x",
    });

    const result = moveTaskToColumn(task, "DONE");

    expect(result.title).toBe("Important task");
    expect(result.priority).toBe("P0");
    expect(result.assignedAgentId).toBe("agent-x");
    expect(result.status).toBe("DONE");
  });

  it("updates the updatedAt timestamp", () => {
    const task = createTask({ id: "t1", updatedAt: 1000 });

    const result = moveTaskToColumn(task, "REVIEW");

    expect(result.updatedAt).toBeGreaterThan(1000);
  });
});

describe("mergeTasksWithEvents", () => {
  it("returns server tasks unchanged when no events", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1", status: "INBOX" }),
      createTask({ id: "t2", status: "IN_PROGRESS" }),
    ];

    const result = mergeTasksWithEvents(tasks, []);

    expect(result).toEqual(tasks);
  });

  it("overrides status from events", () => {
    const tasks: TaskItem[] = [createTask({ id: "t1", status: "INBOX" })];

    const events = [
      createMockEvent({
        eventType: "task.status_changed",
        sequence: 1,
        payload: { taskId: "t1", status: "IN_PROGRESS" },
      }),
    ];

    const result = mergeTasksWithEvents(tasks, events);

    expect(result[0].status).toBe("IN_PROGRESS");
  });

  it("overrides assignment from events", () => {
    const tasks: TaskItem[] = [
      createTask({ id: "t1", assignedAgentId: null, assignedAgentName: null }),
    ];

    const events = [
      createMockEvent({
        eventType: "task.assigned",
        sequence: 1,
        payload: {
          taskId: "t1",
          agentId: "agent-42",
          agentName: "Research Bot",
        },
      }),
    ];

    const result = mergeTasksWithEvents(tasks, events);

    expect(result[0].assignedAgentId).toBe("agent-42");
    expect(result[0].assignedAgentName).toBe("Research Bot");
  });

  it("applies latest event when multiple events for same task", () => {
    const tasks: TaskItem[] = [createTask({ id: "t1", status: "INBOX" })];

    const events = [
      createMockEvent({
        eventType: "task.status_changed",
        sequence: 1,
        payload: { taskId: "t1", status: "IN_PROGRESS" },
      }),
      createMockEvent({
        eventType: "task.status_changed",
        sequence: 2,
        payload: { taskId: "t1", status: "REVIEW" },
      }),
    ];

    const result = mergeTasksWithEvents(tasks, events);

    expect(result[0].status).toBe("REVIEW");
  });

  it("ignores events without taskId payload", () => {
    const tasks: TaskItem[] = [createTask({ id: "t1", status: "INBOX" })];

    const events = [
      createMockEvent({
        eventType: "task.status_changed",
        sequence: 1,
        payload: {},
      }),
    ];

    const result = mergeTasksWithEvents(tasks, events);

    expect(result[0].status).toBe("INBOX");
  });
});

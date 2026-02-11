import { describe, expect, it } from "bun:test";
import { createMockEvent } from "../../__tests__/test-helpers";
import type { TaskItem } from "../task-board-utils";
import {
  groupTasksByStatus,
  mergeTasksWithEvents,
  moveTaskToColumn,
  reorderTaskInColumn,
} from "../task-board-utils";

function createTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    title: "Test Task",
    description: "A test task",
    status: "INBOX",
    priority: "P1",
    assignedAgentId: null,
    assignedAgentName: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("groupTasksByStatus", () => {
  it("creates 5 columns in correct order", () => {
    const columns = groupTasksByStatus([]);

    expect(columns).toHaveLength(5);
    expect(columns[0].status).toBe("INBOX");
    expect(columns[0].label).toBe("Inbox");
    expect(columns[1].status).toBe("ASSIGNED");
    expect(columns[1].label).toBe("Assigned");
    expect(columns[2].status).toBe("IN_PROGRESS");
    expect(columns[2].label).toBe("In Progress");
    expect(columns[3].status).toBe("REVIEW");
    expect(columns[3].label).toBe("Review");
    expect(columns[4].status).toBe("DONE");
    expect(columns[4].label).toBe("Done");
  });

  it("sorts by priority then createdAt within columns", () => {
    const now = Date.now();
    const tasks = [
      createTask({ id: "t1", priority: "P2", createdAt: now }),
      createTask({ id: "t2", priority: "P0", createdAt: now + 100 }),
      createTask({ id: "t3", priority: "P0", createdAt: now }),
      createTask({ id: "t4", priority: "P1", createdAt: now }),
    ];

    const columns = groupTasksByStatus(tasks);
    const inbox = columns[0].tasks;

    expect(inbox).toHaveLength(4);
    expect(inbox[0].id).toBe("t3");
    expect(inbox[1].id).toBe("t2");
    expect(inbox[2].id).toBe("t4");
    expect(inbox[3].id).toBe("t1");
  });

  it("handles empty task list", () => {
    const columns = groupTasksByStatus([]);
    for (const col of columns) {
      expect(col.tasks).toHaveLength(0);
    }
  });
});

describe("mergeTasksWithEvents", () => {
  it("overrides status from task.status_changed events", () => {
    const tasks = [createTask({ id: "task-1", status: "INBOX" })];
    const events = [
      createMockEvent({
        eventType: "task.status_changed",
        payload: { taskId: "task-1", status: "IN_PROGRESS" },
      }),
    ];

    const merged = mergeTasksWithEvents(tasks, events);

    expect(merged[0].status).toBe("IN_PROGRESS");
  });

  it("overrides assignment from task.assigned events", () => {
    const tasks = [
      createTask({
        id: "task-1",
        assignedAgentId: null,
        assignedAgentName: null,
      }),
    ];
    const events = [
      createMockEvent({
        eventType: "task.assigned",
        payload: {
          taskId: "task-1",
          agentId: "agent-42",
          agentName: "Writer Agent",
        },
      }),
    ];

    const merged = mergeTasksWithEvents(tasks, events);

    expect(merged[0].assignedAgentId).toBe("agent-42");
    expect(merged[0].assignedAgentName).toBe("Writer Agent");
  });

  it("returns unchanged tasks when no matching events", () => {
    const tasks = [createTask({ id: "task-1", status: "INBOX" })];
    const events = [
      createMockEvent({
        eventType: "task.status_changed",
        payload: { taskId: "task-999", status: "DONE" },
      }),
    ];

    const merged = mergeTasksWithEvents(tasks, events);

    expect(merged[0]).toBe(tasks[0]);
  });
});

describe("moveTaskToColumn", () => {
  it("returns task with updated status and timestamp", () => {
    const before = Date.now();
    const task = createTask({ id: "task-1", status: "INBOX" });
    const moved = moveTaskToColumn(task, "IN_PROGRESS");
    const after = Date.now();

    expect(moved.status).toBe("IN_PROGRESS");
    expect(moved.updatedAt).toBeGreaterThanOrEqual(before);
    expect(moved.updatedAt).toBeLessThanOrEqual(after);
    expect(moved.id).toBe("task-1");
  });
});

describe("reorderTaskInColumn", () => {
  it("moves task to new position", () => {
    const tasks = [
      createTask({ id: "t1" }),
      createTask({ id: "t2" }),
      createTask({ id: "t3" }),
    ];

    const reordered = reorderTaskInColumn(tasks, "t1", 2);

    expect(reordered[0].id).toBe("t2");
    expect(reordered[1].id).toBe("t3");
    expect(reordered[2].id).toBe("t1");
  });

  it("returns unchanged array when task not found", () => {
    const tasks = [createTask({ id: "t1" }), createTask({ id: "t2" })];

    const reordered = reorderTaskInColumn(tasks, "nonexistent", 0);

    expect(reordered).toEqual(tasks);
  });
});

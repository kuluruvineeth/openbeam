import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

type TaskStatus = "INBOX" | "ASSIGNED" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TaskPriority = "P0" | "P1" | "P2" | "P3";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  createdAt: number;
  updatedAt: number;
};

type KanbanColumn = {
  status: TaskStatus;
  label: string;
  tasks: TaskItem[];
};

const COLUMN_ORDER: { status: TaskStatus; label: string }[] = [
  { status: "INBOX", label: "Inbox" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "REVIEW", label: "Review" },
  { status: "DONE", label: "Done" },
];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function compareTasks(a: TaskItem, b: TaskItem): number {
  const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  return a.createdAt - b.createdAt;
}

export function groupTasksByStatus(tasks: TaskItem[]): KanbanColumn[] {
  const byStatus = new Map<TaskStatus, TaskItem[]>();
  for (const col of COLUMN_ORDER) {
    byStatus.set(col.status, []);
  }

  for (const task of tasks) {
    byStatus.get(task.status)?.push(task);
  }

  return COLUMN_ORDER.map(({ status, label }) => ({
    status,
    label,
    tasks: [...(byStatus.get(status) ?? [])].sort(compareTasks),
  }));
}

export function mergeTasksWithEvents(
  serverTasks: TaskItem[],
  events: MissionEventLedgerItem[]
): TaskItem[] {
  const statusOverrides = new Map<string, TaskStatus>();
  const assignmentOverrides = new Map<
    string,
    { agentId: string; agentName: string }
  >();

  for (const event of events) {
    const taskId = event.payload?.taskId as string | undefined;
    if (!taskId) {
      continue;
    }

    if (event.eventType === "task.status_changed") {
      statusOverrides.set(taskId, event.payload?.status as TaskStatus);
    }

    if (event.eventType === "task.assigned") {
      assignmentOverrides.set(taskId, {
        agentId: event.payload?.agentId as string,
        agentName: event.payload?.agentName as string,
      });
    }
  }

  return serverTasks.map((task) => {
    const statusUpdate = statusOverrides.get(task.id);
    const assignmentUpdate = assignmentOverrides.get(task.id);

    if (!(statusUpdate || assignmentUpdate)) {
      return task;
    }

    return {
      ...task,
      ...(statusUpdate && { status: statusUpdate }),
      ...(assignmentUpdate && {
        assignedAgentId: assignmentUpdate.agentId,
        assignedAgentName: assignmentUpdate.agentName,
      }),
    };
  });
}

export function reorderTaskInColumn(
  tasks: TaskItem[],
  taskId: string,
  newIndex: number
): TaskItem[] {
  const currentIndex = tasks.findIndex((t) => t.id === taskId);
  if (currentIndex === -1) {
    return tasks;
  }

  const result = [...tasks];
  const [moved] = result.splice(currentIndex, 1);
  result.splice(newIndex, 0, moved);
  return result;
}

export function moveTaskToColumn(
  task: TaskItem,
  targetStatus: TaskStatus
): TaskItem {
  return {
    ...task,
    status: targetStatus,
    updatedAt: Date.now(),
  };
}

export type { TaskStatus, TaskPriority, TaskItem, KanbanColumn };

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  groupTasksByStatus,
  moveTaskToColumn,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from "../lib/task-board-utils";

export function useTaskBoard(_missionId: string, _runId: string) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const columns = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  const selectTask = useCallback((id: string | null) => {
    setSelectedTaskId(id);
  }, []);

  const addTask = useCallback((title: string, priority: TaskPriority) => {
    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title,
      description: "",
      status: "INBOX",
      priority,
      assignedAgentId: null,
      assignedAgentName: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
  }, []);

  const moveTask = useCallback((taskId: string, targetStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? moveTaskToColumn(t, targetStatus) : t))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTaskId((prev) => (prev === taskId ? null : prev));
  }, []);

  const setPriority = useCallback((taskId: string, priority: TaskPriority) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, priority, updatedAt: Date.now() } : t
      )
    );
  }, []);

  return {
    columns,
    tasks,
    selectedTaskId,
    selectTask,
    addTask,
    moveTask,
    deleteTask,
    setPriority,
  } as const;
}

export type ObjectiveStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked";

export interface Objective {
  id: string;
  content: string;
  status: ObjectiveStatus;
  priority: number;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
  blockedBy?: string;
}

export interface ObjectiveTrackerOptions {
  maxObjectives?: number;
  recitationInterval?: number;
}

const DEFAULT_MAX_OBJECTIVES = 20;
const DEFAULT_RECITATION_INTERVAL = 5;

export class ObjectiveTracker {
  private readonly objectives = new Map<string, Objective>();
  private readonly maxObjectives: number;
  private readonly recitationInterval: number;
  private objectiveCounter = 0;
  private stepsSinceRecitation = 0;

  constructor(options: ObjectiveTrackerOptions = {}) {
    this.maxObjectives = options.maxObjectives ?? DEFAULT_MAX_OBJECTIVES;
    this.recitationInterval =
      options.recitationInterval ?? DEFAULT_RECITATION_INTERVAL;
  }

  add(content: string, priority = 1, parentId?: string): string {
    if (this.objectives.size >= this.maxObjectives) {
      this.pruneCompleted();
    }

    this.objectiveCounter += 1;
    const id = `obj_${this.objectiveCounter}`;
    const now = Date.now();

    this.objectives.set(id, {
      id,
      content,
      status: "pending",
      priority,
      createdAt: now,
      updatedAt: now,
      parentId,
    });

    return id;
  }

  setStatus(id: string, status: ObjectiveStatus, blockedBy?: string): boolean {
    const objective = this.objectives.get(id);
    if (!objective) {
      return false;
    }

    objective.status = status;
    objective.updatedAt = Date.now();
    if (blockedBy) {
      objective.blockedBy = blockedBy;
    }
    return true;
  }

  markInProgress(id: string): boolean {
    return this.setStatus(id, "in_progress");
  }

  markCompleted(id: string): boolean {
    return this.setStatus(id, "completed");
  }

  markBlocked(id: string, blockedBy: string): boolean {
    return this.setStatus(id, "blocked", blockedBy);
  }

  get(id: string): Objective | undefined {
    return this.objectives.get(id);
  }

  getAll(): Objective[] {
    return Array.from(this.objectives.values());
  }

  getByStatus(status: ObjectiveStatus): Objective[] {
    return this.getAll().filter((o) => o.status === status);
  }

  getPending(): Objective[] {
    return this.getByStatus("pending");
  }

  getInProgress(): Objective[] {
    return this.getByStatus("in_progress");
  }

  getCompleted(): Objective[] {
    return this.getByStatus("completed");
  }

  getCurrentObjective(): Objective | undefined {
    const inProgress = this.getInProgress();
    if (inProgress.length > 0) {
      return inProgress.sort((a, b) => b.priority - a.priority)[0];
    }

    const pending = this.getPending();
    if (pending.length > 0) {
      return pending.sort((a, b) => b.priority - a.priority)[0];
    }

    return;
  }

  recordStep(): boolean {
    this.stepsSinceRecitation += 1;
    return this.stepsSinceRecitation >= this.recitationInterval;
  }

  resetRecitationCounter(): void {
    this.stepsSinceRecitation = 0;
  }

  shouldRecite(): boolean {
    return this.stepsSinceRecitation >= this.recitationInterval;
  }

  generateRecitation(): string {
    this.resetRecitationCounter();

    const current = this.getCurrentObjective();
    const completed = this.getCompleted();
    const pending = this.getPending();
    const blocked = this.getByStatus("blocked");

    const lines: string[] = ["## Objective Status"];

    if (current) {
      lines.push(`**Current:** ${current.content}`);
    }

    if (completed.length > 0) {
      lines.push(`**Completed (${completed.length}):**`);
      for (const obj of completed.slice(-3)) {
        lines.push(`  - ${obj.content}`);
      }
    }

    if (pending.length > 0) {
      lines.push(`**Pending (${pending.length}):**`);
      for (const obj of pending.slice(0, 3)) {
        lines.push(`  - ${obj.content}`);
      }
    }

    if (blocked.length > 0) {
      lines.push(`**Blocked (${blocked.length}):**`);
      for (const obj of blocked) {
        lines.push(`  - ${obj.content} (by: ${obj.blockedBy})`);
      }
    }

    return lines.join("\n");
  }

  getProgress(): { completed: number; total: number; percent: number } {
    const all = this.getAll();
    const completed = all.filter((o) => o.status === "completed").length;
    const total = all.length;
    return {
      completed,
      total,
      percent: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  remove(id: string): boolean {
    return this.objectives.delete(id);
  }

  clear(): void {
    this.objectives.clear();
    this.objectiveCounter = 0;
    this.stepsSinceRecitation = 0;
  }

  private pruneCompleted(): void {
    const completed = this.getCompleted().sort(
      (a, b) => a.updatedAt - b.updatedAt
    );

    const toRemove = completed.slice(0, Math.ceil(completed.length / 2));

    for (const obj of toRemove) {
      this.objectives.delete(obj.id);
    }
  }
}

export function createObjectiveTracker(
  options?: ObjectiveTrackerOptions
): ObjectiveTracker {
  return new ObjectiveTracker(options);
}

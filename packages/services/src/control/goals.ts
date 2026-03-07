import {
  createControlGoal,
  type Database,
  findControlGoalById,
  listControlGoals,
  updateControlGoal,
} from "@openbeam/db";
import type { CreateControlGoalInput } from "@openbeam/types/control/validators/goals";
import { ControlServiceError } from "./errors";

const MAX_HIERARCHY_DEPTH = 20;

export async function createControlGoalForTeam(
  db: Database,
  teamId: string,
  input: CreateControlGoalInput
) {
  if (input.parentId) {
    await validateGoalParent(db, teamId, input.parentId, null);
  }

  return createControlGoal(db, {
    teamId,
    title: input.title,
    description: input.description ?? undefined,
    level: input.level,
    status: input.status,
    parentId: input.parentId ?? undefined,
    ownerAgentId: input.ownerAgentId ?? undefined,
  });
}

export async function getControlGoalForTeam(
  db: Database,
  teamId: string,
  goalId: string
) {
  const goal = await findControlGoalById(db, goalId, teamId);
  if (!goal) {
    throw ControlServiceError.notFound("Goal");
  }
  return goal;
}

export async function listControlGoalsForTeam(
  db: Database,
  teamId: string,
  options?: { level?: string; limit?: number }
) {
  return await listControlGoals(db, teamId, options);
}

export async function updateControlGoalForTeam(
  db: Database,
  teamId: string,
  goalId: string,
  data: Record<string, unknown>
) {
  await getControlGoalForTeam(db, teamId, goalId);

  if (typeof data.parentId === "string") {
    await validateGoalParent(db, teamId, data.parentId, goalId);
  }

  await updateControlGoal(db, goalId, teamId, data as never);
}

async function validateGoalParent(
  db: Database,
  teamId: string,
  parentId: string,
  selfId: string | null
) {
  let currentId: string | null = parentId;
  let depth = 0;

  while (currentId && depth < MAX_HIERARCHY_DEPTH) {
    if (selfId && currentId === selfId) {
      throw ControlServiceError.unprocessable(
        "Goal hierarchy would create a cycle"
      );
    }
    const goal = await findControlGoalById(db, currentId, teamId);
    if (!goal) {
      throw ControlServiceError.notFound("Parent goal");
    }
    currentId = goal.parentId;
    depth += 1;
  }
}

import {
  archiveControlProject,
  createControlProject,
  createControlProjectWorkspace,
  type Database,
  findControlProjectById,
  linkControlProjectGoal,
  listControlProjects,
  unlinkControlProjectGoal,
  updateControlProject,
} from "@openbeam/db";
import type { CreateControlProjectInput } from "@openbeam/types/control/validators/projects";
import { ControlServiceError } from "./errors";

export async function createControlProjectForTeam(
  db: Database,
  teamId: string,
  input: CreateControlProjectInput
) {
  const project = await createControlProject(db, {
    teamId,
    name: input.name,
    description: input.description ?? undefined,
    status: input.status,
    leadAgentId: input.leadAgentId ?? undefined,
    targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    color: input.color ?? undefined,
  });

  if (input.goalId) {
    await linkControlProjectGoal(db, {
      teamId,
      projectId: project.id,
      goalId: input.goalId,
    });
  }

  if (input.goalIds) {
    for (const goalId of input.goalIds) {
      await linkControlProjectGoal(db, {
        teamId,
        projectId: project.id,
        goalId,
      });
    }
  }

  if (input.workspace) {
    await createControlProjectWorkspace(db, {
      teamId,
      projectId: project.id,
      name: input.workspace.name ?? project.name,
      cwd: input.workspace.cwd ?? undefined,
      repoUrl: input.workspace.repoUrl ?? undefined,
      repoRef: input.workspace.repoRef ?? undefined,
      metadata: input.workspace.metadata ?? undefined,
      isPrimary: input.workspace.isPrimary,
    });
  }

  return project;
}

export async function getControlProjectForTeam(
  db: Database,
  teamId: string,
  projectId: string
) {
  const project = await findControlProjectById(db, projectId, teamId);
  if (!project) {
    throw ControlServiceError.notFound("Project");
  }
  return project;
}

export async function listControlProjectsForTeam(
  db: Database,
  teamId: string,
  options?: { limit?: number; offset?: number }
) {
  return await listControlProjects(db, teamId, options);
}

export async function updateControlProjectForTeam(
  db: Database,
  teamId: string,
  projectId: string,
  data: Record<string, unknown>
) {
  await getControlProjectForTeam(db, teamId, projectId);

  const updateData: Record<string, unknown> = { ...data };
  if (typeof data.targetDate === "string") {
    updateData.targetDate = new Date(data.targetDate as string);
  }

  await updateControlProject(db, projectId, teamId, updateData as never);
}

export async function archiveControlProjectForTeam(
  db: Database,
  teamId: string,
  projectId: string
) {
  await getControlProjectForTeam(db, teamId, projectId);
  await archiveControlProject(db, projectId, teamId);
}

export async function addControlProjectWorkspaceForTeam(
  db: Database,
  params: {
    teamId: string;
    projectId: string;
    name: string;
    cwd?: string;
    repoUrl?: string;
    repoRef?: string;
    metadata?: Record<string, unknown>;
    isPrimary?: boolean;
  }
) {
  await getControlProjectForTeam(db, params.teamId, params.projectId);
  return createControlProjectWorkspace(db, params);
}

export async function linkControlProjectGoalForTeam(
  db: Database,
  params: { teamId: string; projectId: string; goalId: string }
) {
  await getControlProjectForTeam(db, params.teamId, params.projectId);
  return linkControlProjectGoal(db, params);
}

export async function unlinkControlProjectGoalForTeam(
  db: Database,
  projectId: string,
  goalId: string
) {
  return await unlinkControlProjectGoal(db, projectId, goalId);
}

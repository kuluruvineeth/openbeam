import type { LinearClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface ProjectResult extends ActionResult {
  project?: {
    id: string;
    name: string;
    description?: string;
    state: string;
    url: string;
    startDate?: string;
    targetDate?: string;
  };
}

interface ProjectCreateResult extends ActionResult {
  id?: string;
  url?: string;
}

export async function getProject(
  client: LinearClient,
  projectId: string
): Promise<ProjectResult> {
  try {
    const data = await client.query<{
      project: {
        id: string;
        name: string;
        description: string;
        status: { name: string; type: string };
        url: string;
        startDate: string;
        targetDate: string;
      };
    }>(
      `query($id: String!) {
        project(id: $id) { id name description status { name type } url startDate targetDate }
      }`,
      { id: projectId }
    );

    return {
      success: true,
      project: {
        ...data.project,
        state: data.project.status.name,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get project",
    };
  }
}

export async function createProject(
  client: LinearClient,
  params: {
    name: string;
    teamIds: string[];
    description?: string;
    leadId?: string;
    targetDate?: string;
  }
): Promise<ProjectCreateResult> {
  try {
    const input: Record<string, unknown> = {
      name: params.name,
      teamIds: params.teamIds,
    };
    if (params.description) {
      input.description = params.description;
    }
    if (params.leadId) {
      input.leadId = params.leadId;
    }
    if (params.targetDate) {
      input.targetDate = params.targetDate;
    }

    const data = await client.mutation<{
      projectCreate: {
        success: boolean;
        project?: { id: string; url: string };
      };
    }>(
      `mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) { success project { id url } }
      }`,
      { input }
    );

    if (!(data.projectCreate.success && data.projectCreate.project)) {
      return { success: false, error: "Failed to create project" };
    }
    return {
      success: true,
      id: data.projectCreate.project.id,
      url: data.projectCreate.project.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

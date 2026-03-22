import type {
  FigmaComment,
  FigmaFileDetail,
  FigmaFileMeta,
  FigmaProject,
} from "@openbeam/types/services/connectors/figma";
import type { FigmaClient } from "../client";

type TeamProjectsResponse = {
  projects: FigmaProject[];
};

type ProjectFilesResponse = {
  files: FigmaFileMeta[];
};

type FileCommentsResponse = {
  comments: FigmaComment[];
};

export async function getTeamProjects(
  client: FigmaClient,
  teamId: string
): Promise<FigmaProject[]> {
  const res = await client.get<TeamProjectsResponse>(
    `/teams/${teamId}/projects`
  );
  return res.projects;
}

export async function getProjectFiles(
  client: FigmaClient,
  projectId: string
): Promise<FigmaFileMeta[]> {
  const res = await client.get<ProjectFilesResponse>(
    `/projects/${projectId}/files`
  );
  return res.files;
}

export function getFileDetail(
  client: FigmaClient,
  fileKey: string
): Promise<FigmaFileDetail> {
  return client.get<FigmaFileDetail>(`/files/${fileKey}`, {
    depth: "1",
  });
}

export async function getFileComments(
  client: FigmaClient,
  fileKey: string
): Promise<FigmaComment[]> {
  const res = await client.get<FileCommentsResponse>(
    `/files/${fileKey}/comments`
  );
  return res.comments.map((c) => ({ ...c, file_key: fileKey }));
}

export async function* getAllTeamFiles(
  client: FigmaClient,
  teamId: string,
  options: {
    includeProjects?: string[];
    excludeProjects?: string[];
  } = {}
): AsyncGenerator<{ project: FigmaProject; files: FigmaFileMeta[] }> {
  const projects = await getTeamProjects(client, teamId);

  for (const project of projects) {
    if (
      options.includeProjects?.length &&
      !options.includeProjects.includes(project.id)
    ) {
      continue;
    }

    if (options.excludeProjects?.includes(project.id)) {
      continue;
    }

    const files = await getProjectFiles(client, project.id);
    yield { project, files };
  }
}

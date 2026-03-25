import { logger } from "../../lib/logger";
import type { JenkinsClient } from "../client";

export interface JenkinsBuildParameter {
  name: string;
  value: string;
}

export interface JenkinsBuildAction {
  _class?: string;
  parameters?: JenkinsBuildParameter[];
  causes?: Array<{
    shortDescription?: string;
    userName?: string;
    userId?: string;
  }>;
}

export interface JenkinsBuild {
  number: number;
  url: string;
  result: string | null;
  timestamp: number;
  duration: number;
  estimatedDuration: number;
  displayName?: string;
  description?: string;
  building: boolean;
  actions?: JenkinsBuildAction[];
}

interface BuildListResponse {
  builds?: JenkinsBuild[];
}

const BUILD_TREE =
  "builds[number,url,result,timestamp,duration,estimatedDuration,displayName,description,building,actions[_class,parameters[name,value],causes[shortDescription,userName,userId]]]";

export async function listBuilds(
  client: JenkinsClient,
  jobPath: string,
  maxBuilds = 25
): Promise<JenkinsBuild[]> {
  const range = maxBuilds > 0 ? `{0,${maxBuilds}}` : "";
  const response = await client.get<BuildListResponse>(
    `/job/${encodeJobPath(jobPath)}/api/json`,
    { tree: `${BUILD_TREE}${range}` }
  );
  return response.builds ?? [];
}

export async function getBuildConsoleOutput(
  client: JenkinsClient,
  jobPath: string,
  buildNumber: number
): Promise<string> {
  try {
    const text = await client.getText(
      `/job/${encodeJobPath(jobPath)}/${buildNumber}/consoleText`
    );
    const MAX_CONSOLE_LENGTH = 50_000;
    if (text.length > MAX_CONSOLE_LENGTH) {
      return `${text.slice(0, MAX_CONSOLE_LENGTH)}\n... [truncated]`;
    }
    return text;
  } catch (error) {
    logger.warn(
      { jobPath, buildNumber, error },
      "Failed to fetch build console output"
    );
    return "";
  }
}

function encodeJobPath(jobPath: string): string {
  return jobPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/job/");
}

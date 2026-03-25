import type { JenkinsClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export async function triggerBuild(
  client: JenkinsClient,
  jobPath: string
): Promise<ActionResult> {
  try {
    const encodedPath = jobPath
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/job/");
    await client.post(`/job/${encodedPath}/build`);
    return {
      success: true,
      id: jobPath,
      url: `${client.instanceUrl}/job/${encodedPath}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to trigger build",
    };
  }
}

export async function disableJob(
  client: JenkinsClient,
  jobPath: string
): Promise<ActionResult> {
  try {
    const encodedPath = jobPath
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/job/");
    await client.post(`/job/${encodedPath}/disable`);
    return { success: true, id: jobPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disable job",
    };
  }
}

export async function enableJob(
  client: JenkinsClient,
  jobPath: string
): Promise<ActionResult> {
  try {
    const encodedPath = jobPath
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/job/");
    await client.post(`/job/${encodedPath}/enable`);
    return { success: true, id: jobPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to enable job",
    };
  }
}

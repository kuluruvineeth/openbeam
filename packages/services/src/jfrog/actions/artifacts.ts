import type { JFrogClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CopyArtifactParams {
  srcRepo: string;
  srcPath: string;
  destRepo: string;
  destPath: string;
  dryRun?: boolean;
}

interface DeleteArtifactParams {
  repo: string;
  path: string;
}

interface SetArtifactPropertiesParams {
  repo: string;
  path: string;
  properties: Record<string, string>;
}

export async function copyArtifact(
  client: JFrogClient,
  params: CopyArtifactParams
): Promise<ActionResult> {
  try {
    const dryRunParam = params.dryRun ? "1" : "0";
    await client.post(
      `/artifactory/api/copy/${params.srcRepo}/${params.srcPath}?to=/${params.destRepo}/${params.destPath}&dry=${dryRunParam}`,
      {}
    );

    return {
      success: true,
      id: `${params.destRepo}/${params.destPath}`,
      url: `${client.instanceUrl}/ui/repos/tree/General/${params.destRepo}/${params.destPath}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to copy artifact",
    };
  }
}

export async function deleteArtifact(
  client: JFrogClient,
  params: DeleteArtifactParams
): Promise<ActionResult> {
  try {
    await client.del(`/artifactory/${params.repo}/${params.path}`);

    return { success: true, id: `${params.repo}/${params.path}` };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete artifact",
    };
  }
}

export async function setArtifactProperties(
  client: JFrogClient,
  params: SetArtifactPropertiesParams
): Promise<ActionResult> {
  try {
    const propString = Object.entries(params.properties)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join(";");

    await client.put(
      `/artifactory/api/storage/${params.repo}/${params.path}?properties=${propString}`,
      {}
    );

    return { success: true, id: `${params.repo}/${params.path}` };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to set artifact properties",
    };
  }
}

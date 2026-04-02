import type { CanvaClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createCanvaDesign(
  client: CanvaClient,
  properties: {
    design_type?: string;
    title?: string;
    width?: number;
    height?: number;
  }
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      design: { id: string; urls?: { edit_url?: string } };
    }>("/designs", {
      design_type:
        properties.width && properties.height
          ? {
              type: "custom",
              width: properties.width,
              height: properties.height,
            }
          : {
              type: "preset",
              name: (
                (properties.design_type as string) ?? "presentation"
              ).toLowerCase(),
            },
      title: properties.title,
    });
    return {
      success: true,
      recordId: result.design.id,
      url: result.design.urls?.edit_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create design",
    };
  }
}

export async function createCanvaFolder(
  client: CanvaClient,
  properties: { name: string; parent_folder_id?: string }
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      folder: { id: string };
    }>("/folders", {
      name: properties.name,
      ...(properties.parent_folder_id && {
        parent_folder_id: properties.parent_folder_id,
      }),
    });
    return {
      success: true,
      recordId: result.folder.id,
      url: `https://www.canva.com/folder/${result.folder.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

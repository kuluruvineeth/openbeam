import { logger } from "../../lib/logger";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

interface SectionListResult {
  success: boolean;
  sections?: Array<{ id: string; displayName: string }>;
  error?: string;
}

export async function listOneNoteSections(
  accessToken: string
): Promise<SectionListResult> {
  try {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/onenote/sections?$select=id,displayName`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to list sections: ${response.status} ${errorText}`,
      };
    }

    const data = (await response.json()) as {
      value: Array<{ id: string; displayName: string }>;
    };

    return {
      success: true,
      sections: data.value.map((s) => ({
        id: s.id,
        displayName: s.displayName,
      })),
    };
  } catch (error) {
    logger.error({ error }, "Failed to list OneNote sections");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list sections",
    };
  }
}

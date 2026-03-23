import { logger } from "../../lib/logger";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface PageActionResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

export async function createOneNotePage(
  accessToken: string,
  sectionId: string,
  params: { title: string; htmlContent: string }
): Promise<PageActionResult> {
  const html = `<!DOCTYPE html>
<html>
<head><title>${escapeHtml(params.title)}</title></head>
<body>${params.htmlContent}</body>
</html>`;

  try {
    const response = await fetch(
      `${GRAPH_BASE_URL}/me/onenote/sections/${sectionId}/pages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/xhtml+xml",
        },
        body: html,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to create page: ${response.status} ${errorText}`,
      };
    }

    const created = (await response.json()) as {
      id: string;
      links?: { oneNoteWebUrl?: { href: string } };
    };

    return {
      success: true,
      pageId: created.id,
      url: created.links?.oneNoteWebUrl?.href,
    };
  } catch (error) {
    logger.error({ error, sectionId }, "Failed to create OneNote page");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updateOneNotePageContent(
  accessToken: string,
  pageId: string,
  params: { target: string; action: "append" | "replace"; content: string }
): Promise<PageActionResult> {
  try {
    const patchBody = [
      {
        target: params.target,
        action: params.action,
        content: params.content,
      },
    ];

    const response = await fetch(
      `${GRAPH_BASE_URL}/me/onenote/pages/${pageId}/content`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to update page: ${response.status} ${errorText}`,
      };
    }

    return {
      success: true,
      pageId,
    };
  } catch (error) {
    logger.error({ error, pageId }, "Failed to update OneNote page content");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

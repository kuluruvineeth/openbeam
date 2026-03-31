import {
  createOneNotePage,
  updateOneNotePageContent,
} from "../../onenote/actions";
import { registerHandler } from "../handler-registry";

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

registerHandler({
  connectorType: "onenote",
  async execute(actionId, params, credentials) {
    const token = credentials.accessToken || "";

    if (actionId === "page_create") {
      const r = await createOneNotePage(token, str(params, "sectionId"), {
        title: str(params, "title"),
        htmlContent: str(params, "htmlContent"),
      });
      if (!r.success) {
        return { success: false, data: {}, error: r.error };
      }
      return { success: true, data: { pageId: r.pageId, url: r.url } };
    }

    if (actionId === "page_update") {
      const r = await updateOneNotePageContent(token, str(params, "pageId"), {
        target: str(params, "target"),
        action: str(params, "action") as "append" | "replace",
        content: str(params, "content"),
      });
      if (!r.success) {
        return { success: false, data: {}, error: r.error };
      }
      return { success: true, data: { pageId: r.pageId } };
    }

    return {
      success: false,
      data: {},
      error: `Unsupported OneNote action: ${actionId}`,
    };
  },
});

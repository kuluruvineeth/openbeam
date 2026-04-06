import { createPage, updatePage } from "../../interact/actions";
import {
  createInteractClient,
  type InteractClient,
} from "../../interact/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { optStr, str } from "./shared/params";

type Handler = (
  client: InteractClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  throw new Error(`${key} is required and must be a number`);
}

function numArray(p: Record<string, unknown>, key: string): number[] {
  const v = p[key];
  if (Array.isArray(v)) {
    return v.map((item) => {
      if (typeof item === "number") {
        return item;
      }
      const n = Number.parseInt(String(item), 10);
      if (Number.isNaN(n)) {
        throw new Error(`${key} must contain numbers`);
      }
      return n;
    });
  }
  throw new Error(`${key} is required and must be an array`);
}

const actions: Record<string, Handler> = {
  async page_create(client, p) {
    const r = await createPage(client, {
      title: str(p, "title"),
      summary: str(p, "summary"),
      contentHtml: str(p, "contentHtml"),
      contentType: optStr(p, "contentType") ?? "Page",
      topSectionIds: numArray(p, "topSectionIds"),
      categoryIds: numArray(p, "categoryIds"),
      pubStartDate: str(p, "pubStartDate"),
      pubEndDate: str(p, "pubEndDate"),
      authorId: num(p, "authorId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async page_update(client, p) {
    const r = await updatePage(client, {
      pageId: str(p, "pageId"),
      title: optStr(p, "title"),
      summary: optStr(p, "summary"),
      contentHtml: optStr(p, "contentHtml"),
      transitionState: str(p, "transitionState"),
      transitionMessage: optStr(p, "transitionMessage"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "interact",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Interact action: ${actionId}`,
      };
    }

    const client = createInteractClient({
      connectorId,
      apiKey: credentials.accessToken,
      instance: (credentials.config.instance as string) ?? "",
    });

    return await handler(client, params);
  },
});

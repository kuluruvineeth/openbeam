import { createTask, updateTask } from "../../phabricator/actions/tasks";
import {
  createWikiPage,
  updateWikiPage,
} from "../../phabricator/actions/wiki-pages";
import {
  createPhabricatorClient,
  type PhabricatorClient,
} from "../../phabricator/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: PhabricatorClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async task_create(client, p) {
    const r = await createTask(client, {
      title: str(p, "title"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      ownerPHID: typeof p.ownerPHID === "string" ? p.ownerPHID : undefined,
      projectPHIDs: Array.isArray(p.projectPHIDs)
        ? (p.projectPHIDs as string[])
        : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async task_update(client, p) {
    const r = await updateTask(client, {
      taskId: str(p, "taskId"),
      title: typeof p.title === "string" ? p.title : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      status: typeof p.status === "string" ? p.status : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async wiki_page_create(client, p) {
    const r = await createWikiPage(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      slug: typeof p.slug === "string" ? p.slug : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async wiki_page_update(client, p) {
    const r = await updateWikiPage(client, {
      pageId: str(p, "pageId"),
      title: typeof p.title === "string" ? p.title : undefined,
      content: typeof p.content === "string" ? p.content : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "phabricator",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Phabricator action: ${actionId}`,
      };
    }

    const client = createPhabricatorClient({
      connectorId: "",
      apiToken: (credentials.config.apiToken as string) ?? "",
      baseUrl: (credentials.config.baseUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});

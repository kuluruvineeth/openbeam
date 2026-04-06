import { createPage, updatePage } from "../../simpplr/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { optStr, str } from "./shared/params";

interface ActionClientConfig {
  accessToken: string;
  userEmail: string;
}

type Handler = (
  config: ActionClientConfig,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async page_create(config, p) {
    const contentSubType = optStr(p, "contentSubType") ?? "knowledge";
    if (contentSubType !== "news" && contentSubType !== "knowledge") {
      return {
        success: false,
        data: {},
        error: "contentSubType must be 'news' or 'knowledge'",
      };
    }

    const publishingStatus = optStr(p, "publishingStatus") ?? "immediate";
    if (publishingStatus !== "immediate" && publishingStatus !== "schedule") {
      return {
        success: false,
        data: {},
        error: "publishingStatus must be 'immediate' or 'schedule'",
      };
    }

    const r = await createPage(config, {
      siteId: str(p, "siteId"),
      title: str(p, "title"),
      body: str(p, "body"),
      contentSubType,
      categoryName: str(p, "categoryName"),
      publishingStatus,
      summary: optStr(p, "summary"),
      publishAt: optStr(p, "publishAt"),
    });

    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async page_update(config, p) {
    const r = await updatePage(config, {
      siteId: str(p, "siteId"),
      contentId: str(p, "contentId"),
      title: optStr(p, "title"),
      body: optStr(p, "body"),
      summary: optStr(p, "summary"),
    });

    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "simpplr",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, _connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Simpplr action: ${actionId}`,
      };
    }

    const userEmail =
      typeof credentials.config.userEmail === "string"
        ? credentials.config.userEmail
        : "";
    if (!userEmail) {
      return {
        success: false,
        data: {},
        error:
          "Simpplr actions require x-user-email header. Provide userEmail in connector config.",
      };
    }

    const config: ActionClientConfig = {
      accessToken: credentials.accessToken,
      userEmail,
    };

    return await handler(config, params);
  },
});

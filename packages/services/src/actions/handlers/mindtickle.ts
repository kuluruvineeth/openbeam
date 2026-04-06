import {
  createMission,
  getUser,
  inviteUser,
  updateContent,
} from "../../mindtickle/actions";
import {
  createMindtickleClient,
  type MindtickleClient,
} from "../../mindtickle/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { optStr, str } from "./shared/params";

type Handler = (
  client: MindtickleClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function optArr(p: Record<string, unknown>, key: string): string[] | undefined {
  const v = p[key];
  return Array.isArray(v) ? (v as string[]) : undefined;
}

const actions: Record<string, Handler> = {
  async mission_create(client, p) {
    const r = await createMission(client, {
      name: str(p, "name"),
      description: str(p, "description"),
      mission_type: str(p, "mission_type"),
      due_date: optStr(p, "due_date"),
      tags: optArr(p, "tags"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async content_update(client, p) {
    const r = await updateContent(client, {
      contentId: str(p, "contentId"),
      title: optStr(p, "title"),
      description: optStr(p, "description"),
      category: optStr(p, "category"),
      tags: optArr(p, "tags"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async user_invite(client, p) {
    const r = await inviteUser(client, {
      email: str(p, "email"),
      firstName: str(p, "firstName"),
      lastName: str(p, "lastName"),
      role: optStr(p, "role"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async user_get(client, p) {
    const r = await getUser(client, { userId: str(p, "userId") });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, user: r.user } };
  },
};

registerHandler({
  connectorType: "mindtickle",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Mindtickle action: ${actionId}`,
      };
    }

    const { apiKey, secretKey, clientId } = credentials.config as {
      apiKey?: string;
      secretKey?: string;
      clientId?: string;
    };

    if (!(apiKey && secretKey && clientId)) {
      return {
        success: false,
        data: {},
        error:
          "Mindtickle requires apiKey, secretKey, and clientId in connector config for JWT authentication",
      };
    }

    const client = createMindtickleClient({
      connectorId,
      apiKey,
      secretKey,
      clientId,
    });

    return await handler(client, params);
  },
});

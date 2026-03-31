import { updatePerson } from "../../haystack/actions";
import {
  createHaystackClient,
  type HaystackClient,
} from "../../haystack/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: HaystackClient,
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
  async person_update(client, p) {
    const r = await updatePerson(client, {
      personId: str(p, "personId"),
      title: typeof p.title === "string" ? p.title : undefined,
      phone: typeof p.phone === "string" ? p.phone : undefined,
      bio: typeof p.bio === "string" ? p.bio : undefined,
      pronouns: typeof p.pronouns === "string" ? p.pronouns : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "haystack",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Haystack action: ${actionId}`,
      };
    }

    const client = createHaystackClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});

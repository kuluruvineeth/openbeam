import { createHighFive } from "../../fifteen-five/actions";
import {
  createFifteenFiveClient,
  type FifteenFiveClient,
} from "../../fifteen-five/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: FifteenFiveClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    throw new Error(`${key} must be a number`);
  }
  return n;
}

const actions: Record<string, Handler> = {
  async high_five_create(client, p) {
    const r = await createHighFive(client, {
      senderId: num(p, "senderId"),
      receiverId: num(p, "receiverId"),
      text: str(p, "text"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "fifteen-five",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported 15Five action: ${actionId}`,
      };
    }

    const client = createFifteenFiveClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});

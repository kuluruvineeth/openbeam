import { requestTimeOff } from "../../bamboohr/actions";
import {
  type BambooHRClient,
  createBambooHRClient,
} from "../../bamboohr/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: BambooHRClient,
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
  async time_off_request(client, p) {
    const r = await requestTimeOff(client, {
      employeeId: str(p, "employeeId"),
      start: str(p, "start"),
      end: str(p, "end"),
      timeOffTypeId: str(p, "timeOffTypeId"),
      notes: typeof p.notes === "string" ? p.notes : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { requested: true } };
  },
};

registerHandler({
  connectorType: "bamboohr",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported BambooHR action: ${actionId}`,
      };
    }

    const client = createBambooHRClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      subdomain: (credentials.config.subdomain as string) ?? "",
    });

    return await handler(client, params);
  },
});

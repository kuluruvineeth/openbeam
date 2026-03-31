import { addCandidateNote } from "../../greenhouse/actions";
import {
  createGreenhouseClient,
  type GreenhouseClient,
} from "../../greenhouse/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GreenhouseClient,
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

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async candidate_note_add(client, p) {
    const r = await addCandidateNote(
      client,
      num(p, "candidateId"),
      str(p, "body"),
      num(p, "userId")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "greenhouse",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Greenhouse action: ${actionId}`,
      };
    }

    const client = createGreenhouseClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});

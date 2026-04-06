import { createLibraryEntry, updateLibraryEntry } from "../../loopio/actions";
import { createLoopioClient, type LoopioClient } from "../../loopio/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: LoopioClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function optStr(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function int(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  if (typeof v === "number" && Number.isInteger(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) {
      return n;
    }
  }
  throw new Error(`${key} is required and must be an integer`);
}

function optInt(p: Record<string, unknown>, key: string): number | undefined {
  const v = p[key];
  if (v === undefined || v === null || v === "") {
    return;
  }
  if (typeof v === "number" && Number.isInteger(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return;
}

function strArray(
  p: Record<string, unknown>,
  key: string
): string[] | undefined {
  const v = p[key];
  if (Array.isArray(v) && v.length > 0) {
    return v.filter((item): item is string => typeof item === "string");
  }
  if (typeof v === "string" && v.trim()) {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return;
}

const actions: Record<string, Handler> = {
  async library_entry_create(client, p) {
    const r = await createLibraryEntry(client, {
      stackID: int(p, "stackID"),
      questionText: str(p, "questionText"),
      text: str(p, "text"),
      categoryID: optInt(p, "categoryID"),
      subCategoryID: optInt(p, "subCategoryID"),
      languageCode: optStr(p, "languageCode"),
      questionComplianceOption: optStr(p, "questionComplianceOption"),
      tags: strArray(p, "tags"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { id: r.id, url: r.url },
    };
  },

  async library_entry_update(client, p) {
    const r = await updateLibraryEntry(client, {
      libraryEntryId: int(p, "libraryEntryId"),
      op: str(p, "op"),
      path: str(p, "path"),
      value: str(p, "value"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { id: r.id, url: r.url },
    };
  },
};

registerHandler({
  connectorType: "loopio",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Loopio action: ${actionId}`,
      };
    }

    const baseUrl =
      typeof credentials.config.baseUrl === "string"
        ? credentials.config.baseUrl
        : undefined;

    const client = createLoopioClient({
      connectorId,
      accessToken: credentials.accessToken,
      baseUrl,
    });

    return await handler(client, params);
  },
});

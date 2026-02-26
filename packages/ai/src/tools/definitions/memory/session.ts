import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import type { SessionState } from "../../../memory/session-state";
import { defineTool, failure, success } from "../../builder";
import { getSessionState, setSessionStateDep } from "./deps";

export function setSessionStateStore(store: SessionState): void {
  setSessionStateDep(store);
}

interface SessionStateResult {
  action: string;
  key?: string;
  value?: unknown;
  found?: boolean;
  stored?: boolean;
  deleted?: boolean;
  exists?: boolean;
  keys?: Array<{
    key: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    spilledToS3: boolean;
  }>;
  totalCount?: number;
  sessionId?: string;
}

export const getSessionStateTool = defineTool({
  name: "getSessionState",
  description: `Access the current session's state storage for reading, writing, or listing keys.

USE THIS WHEN:
- You need to persist data between tool calls within a session
- Storing intermediate results for multi-step operations
- Caching computed values to avoid redundant work
- Tracking progress or state across conversation turns

DO NOT USE WHEN:
- Storing data that should persist beyond the session (use long-term memory)
- Sharing data between different sessions or users
- Storing very large datasets (>10MB total per session)

HOW TO USE:
- action: "get" - Retrieve a value by key
- action: "set" - Store a value with optional TTL
- action: "delete" - Remove a key
- action: "list" - List all keys in the session
- action: "exists" - Check if a key exists

Large values (>512KB) are automatically spilled to S3 for efficiency.`,

  category: "data",
  requiredPermissions: ["session:read", "session:write"],
  searchKeywords: ["session", "state", "store", "persist", "cache", "variable"],

  parameters: z.object({
    action: z
      .enum(["get", "set", "delete", "list", "exists"])
      .describe("The operation to perform on session state"),
    key: z
      .string()
      .optional()
      .describe("The key to operate on (required for get/set/delete/exists)"),
    value: z
      .unknown()
      .optional()
      .describe("The value to store (required for set action)"),
    ttlMs: z
      .number()
      .optional()
      .describe(
        "Time-to-live in milliseconds for set operation (default: 24 hours)"
      ),
  }),

  async execute(
    params,
    _ctx
  ): Promise<ToolExecutionResult<SessionStateResult>> {
    const sessionStateStore = getSessionState();
    if (!sessionStateStore) {
      return failure(
        "INVALID_STATE",
        "Session state store not initialized. Call setSessionStateStore before using this tool.",
        {
          suggestion:
            "Initialize the session state store in your application setup",
        }
      );
    }

    switch (params.action) {
      case "get": {
        if (!params.key) {
          return failure("INVALID_INPUT", "Key is required for get action");
        }
        const value = await sessionStateStore.get(params.key);
        return success({
          action: "get",
          key: params.key,
          value,
          found: value !== null,
        });
      }

      case "set": {
        if (!params.key) {
          return failure("INVALID_INPUT", "Key is required for set action");
        }
        if (params.value === undefined) {
          return failure("INVALID_INPUT", "Value is required for set action");
        }
        await sessionStateStore.set(params.key, params.value, params.ttlMs);
        return success({
          action: "set",
          key: params.key,
          stored: true,
          sessionId: sessionStateStore.getSessionId(),
        });
      }

      case "delete": {
        if (!params.key) {
          return failure("INVALID_INPUT", "Key is required for delete action");
        }
        await sessionStateStore.delete(params.key);
        return success({
          action: "delete",
          key: params.key,
          deleted: true,
        });
      }

      case "list": {
        const metadata = await sessionStateStore.list();
        return success({
          action: "list",
          keys: metadata.map((m) => ({
            key: m.key,
            size: m.size,
            createdAt: new Date(m.createdAt).toISOString(),
            updatedAt: new Date(m.updatedAt).toISOString(),
            spilledToS3: m.spilledToS3,
          })),
          totalCount: metadata.length,
          sessionId: sessionStateStore.getSessionId(),
        });
      }

      case "exists": {
        if (!params.key) {
          return failure("INVALID_INPUT", "Key is required for exists action");
        }
        const exists = await sessionStateStore.exists(params.key);
        return success({
          action: "exists",
          key: params.key,
          exists,
        });
      }

      default:
        return failure("INVALID_INPUT", `Unknown action: ${params.action}`);
    }
  },
});

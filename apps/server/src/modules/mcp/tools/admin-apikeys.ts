import db, { createApiKey, listApiKeys, revokeApiKey } from "@openbeam/db";
import { z } from "zod";
import {
  formatApiKeyCreated,
  formatApiKeyList,
  formatApiKeyRevoked,
} from "../formatters/admin";
import { sanitizeArray } from "../mcp.sanitize";
import {
  DESTRUCTIVE_ANNOTATIONS,
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

const mcpApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  revoked: z.boolean(),
  createdAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export const registerApiKeyTools: RegisterTools = (server, ctx) => {
  if (hasScope(ctx, "apikeys.read")) {
    server.registerTool(
      "apikey_list",
      {
        title: "List API Keys",
        description:
          "List all API keys for the current team. Use this when the user asks about their API keys, wants to audit key usage, or needs to find a key to revoke.\n\nReturns each key's: ID, display name, prefix (first 12 characters — the full key is never stored or returned), granted scopes, revoked status, creation date, last-used date, and expiration date. The full secret is only shown once at creation time via apikey_create.\n\nNo parameters required — returns all keys for the authenticated team.\n\nTo create a new key, use apikey_create. To revoke an existing key, use apikey_revoke with the key ID from this list.",
        inputSchema: {},
        annotations: READ_ONLY_ANNOTATIONS,
      },
      withErrorHandling(async () => {
        const keys = await listApiKeys(db, { teamId: ctx.teamId });

        const clean = sanitizeArray(
          mcpApiKeySchema,
          keys.map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            scopes: k.scopes,
            revoked: k.revoked,
            createdAt: k.createdAt.toISOString(),
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            expiresAt: k.expiresAt?.toISOString() ?? null,
          }))
        );

        return {
          content: [{ type: "text" as const, text: formatApiKeyList(clean) }],
          structuredContent: { data: clean },
        };
      }, "Failed to list API keys")
    );
  }

  if (hasScope(ctx, "apikeys.write")) {
    server.registerTool(
      "apikey_create",
      {
        title: "Create API Key",
        description:
          "Create a new API key for the current team. Use this when the user needs a new key for MCP access, CI/CD pipelines, or programmatic API calls.\n\nReturns the full key (op_live_...) exactly once — it cannot be retrieved later, so the user must copy it immediately. Also returns the key ID and prefix for future reference.\n\nParameters:\n- name (required): A human-readable label for the key (e.g. 'CI pipeline', 'Claude Desktop').\n- scopes (optional): Array of permission scopes to grant. Defaults to ['connectors:read', 'connectors:write', 'connectors:sync', 'search:read'] if omitted.\n\nTo list existing keys, use apikey_list. To revoke a key, use apikey_revoke.",
        inputSchema: {
          name: z
            .string()
            .min(1)
            .max(100)
            .describe("Human-readable label for the key"),
          scopes: z
            .array(z.string())
            .optional()
            .describe("Permission scopes to grant. Omit for default scopes."),
        },
        annotations: WRITE_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const result = await createApiKey(db, {
          teamId: ctx.teamId,
          name: params.name,
          scopes: params.scopes,
        });

        return {
          content: [
            { type: "text" as const, text: formatApiKeyCreated(result) },
          ],
          structuredContent: {
            data: {
              id: result.id,
              key: result.key,
              prefix: result.prefix,
              createdAt: result.createdAt.toISOString(),
            },
          },
        };
      }, "Failed to create API key")
    );

    server.registerTool(
      "apikey_revoke",
      {
        title: "Revoke API Key",
        description:
          "Permanently revoke an API key by its ID. Use this when the user wants to disable a compromised, unused, or rotated key. This action is irreversible — any request using the revoked key will be rejected immediately.\n\nParameters:\n- apiKeyId (required): The ID of the key to revoke. Use apikey_list first to find the correct ID.\n\nDo NOT use this to delete or rename a key — revocation is the only removal mechanism. To replace a revoked key, create a new one with apikey_create.",
        inputSchema: {
          apiKeyId: z
            .string()
            .min(1)
            .describe("The ID of the API key to revoke"),
        },
        annotations: DESTRUCTIVE_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const revoked = await revokeApiKey(db, {
          id: params.apiKeyId,
          teamId: ctx.teamId,
        });

        if (!revoked) {
          return {
            content: [
              {
                type: "text" as const,
                text: "API key not found or already revoked.",
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatApiKeyRevoked(params.apiKeyId),
            },
          ],
          structuredContent: {
            data: { id: params.apiKeyId, revoked: true },
          },
        };
      }, "Failed to revoke API key")
    );
  }
};

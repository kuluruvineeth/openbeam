/**
 * API Keys Management Module
 * Entry point for API key operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  createApiKeyHandler,
  deleteApiKeyHandler,
  getApiKeyHandler,
  getApiKeyUsageHandler,
  listApiKeysHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
  updateApiKeyHandler,
} from "./api-keys.handlers";
import {
  createApiKey,
  deleteApiKey,
  getApiKey,
  getApiKeyUsage,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
} from "./api-keys.routes";

const apiKeys = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
apiKeys.use("/*", requireAuth);

// ============================================================================
// API Key Endpoints
// ============================================================================

// List API keys - requires api_keys:read
apiKeys.use("/", requireScopes([API_SCOPES.API_KEYS_READ]));
apiKeys.openapi(listApiKeys, listApiKeysHandler);

// Create API key - requires api_keys:write
apiKeys.use("/", requireScopes([API_SCOPES.API_KEYS_WRITE]));
apiKeys.openapi(createApiKey, createApiKeyHandler);

// Get API key - requires api_keys:read
apiKeys.use("/:keyId", requireScopes([API_SCOPES.API_KEYS_READ]));
apiKeys.openapi(getApiKey, getApiKeyHandler);

// Update API key - requires api_keys:write
apiKeys.use("/:keyId", requireScopes([API_SCOPES.API_KEYS_WRITE]));
apiKeys.openapi(updateApiKey, updateApiKeyHandler);

// Revoke API key - requires api_keys:delete
apiKeys.use("/:keyId/revoke", requireScopes([API_SCOPES.API_KEYS_DELETE]));
apiKeys.openapi(revokeApiKey, revokeApiKeyHandler);

// Delete API key - requires api_keys:delete
apiKeys.use("/:keyId", requireScopes([API_SCOPES.API_KEYS_DELETE]));
apiKeys.openapi(deleteApiKey, deleteApiKeyHandler);

// Get API key usage - requires api_keys:read
apiKeys.openapi(getApiKeyUsage, getApiKeyUsageHandler);

// Rotate API key - requires api_keys:write
apiKeys.use("/:keyId/rotate", requireScopes([API_SCOPES.API_KEYS_WRITE]));
apiKeys.openapi(rotateApiKey, rotateApiKeyHandler);

export default apiKeys;

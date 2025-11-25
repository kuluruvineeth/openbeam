/**
 * Public API v1 Router
 * Composed from all API modules for a world-class developer experience
 *
 * Architecture follows best practices from Slack, Cursor, and other leading APIs:
 * - RESTful resource-oriented design
 * - Consistent response format
 * - Comprehensive error handling
 * - Granular permission scopes
 * - Full OpenAPI documentation
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";

// Import all API modules
import apiKeys from "@/modules/api-keys/api-keys.index";
import chat from "@/modules/chat/chat.index";
import collections from "@/modules/collections/collections.index";
import connectors from "@/modules/connectors/connectors.index";
import documents from "@/modules/documents/documents.index";
import people from "@/modules/people/people.index";
import search from "@/modules/search/search.index";
import webhooks from "@/modules/webhooks/webhooks.index";

const v1 = new OpenAPIHono<AuthEnv>();

// ============================================================================
// Health Check
// ============================================================================

v1.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "v1",
    timestamp: new Date().toISOString(),
  })
);

// ============================================================================
// Core Search & Discovery APIs
// ============================================================================

/**
 * Search API
 * Endpoints for document search, autocomplete, and semantic discovery
 *
 * @tag Search
 * @example GET /api/v1/search?q=project+docs&ranking=hybrid
 * @example GET /api/v1/search/autocomplete?q=proj
 * @example GET /api/v1/search/similar/doc_123
 */
v1.route("/search", search);

/**
 * Documents API
 * CRUD operations for indexed documents
 *
 * @tag Documents
 * @example GET /api/v1/documents
 * @example POST /api/v1/documents
 * @example GET /api/v1/documents/:id
 */
v1.route("/documents", documents);

/**
 * People Directory API
 * Search and explore the organization directory
 *
 * @tag People
 * @example GET /api/v1/people/search?q=john
 * @example GET /api/v1/people/:personId
 * @example GET /api/v1/people/:personId/org-chart
 */
v1.route("/people", people);

// ============================================================================
// AI & Chat APIs
// ============================================================================

/**
 * Chat & Assistants API
 * AI-powered conversations and custom assistants
 *
 * @tag Conversations
 * @tag Assistants
 * @example POST /api/v1/chat/conversations
 * @example POST /api/v1/chat/conversations/:id/messages
 * @example GET /api/v1/chat/assistants
 */
v1.route("/chat", chat);

// ============================================================================
// Organization & Personalization APIs
// ============================================================================

/**
 * Collections & Bookmarks API
 * Curated collections and personal bookmarks
 *
 * @tag Collections
 * @tag Bookmarks
 * @example GET /api/v1/collections
 * @example POST /api/v1/collections/:id/items
 * @example GET /api/v1/bookmarks
 */
v1.route("/", collections);

// ============================================================================
// Data Integration APIs
// ============================================================================

/**
 * Connectors API
 * Manage data source connections and syncs
 *
 * @tag Connectors
 * @example POST /api/v1/connectors/:id/sync
 * @example GET /api/v1/connectors/:id/sync-status
 * @example POST /api/v1/connectors/:id/pause
 */
v1.route("/connectors", connectors);

/**
 * Webhooks API
 * Receive real-time updates from connected services
 *
 * @tag Webhooks
 * @example POST /api/v1/webhooks/slack/events
 */
v1.route("/webhooks", webhooks);

// ============================================================================
// Platform Management APIs
// ============================================================================

/**
 * API Keys API
 * Manage API keys for programmatic access
 *
 * @tag API Keys
 * @example GET /api/v1/api-keys
 * @example POST /api/v1/api-keys
 * @example POST /api/v1/api-keys/:id/rotate
 */
v1.route("/api-keys", apiKeys);

export default v1;

/**
 * Main Router Composition
 * Combines all tRPC routers for the internal web app
 *
 * All routers use @openplane/db for data access.
 */

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../index";

// Import all routers
import { actionsRouter } from "./actions";
import { analyticsRouter } from "./analytics";
import { apiKeysRouter } from "./api-keys";
import { appsRouter } from "./apps";
import { chatRouter } from "./chat";
import { collectionsRouter } from "./collections";
import { documentsRouter } from "./documents";
import { enterpriseRouter } from "./enterprise";
import { peopleRouter } from "./people";
import { permissionsRouter } from "./permissions";
import { preferencesRouter } from "./preferences";
import { searchRouter } from "./search";
import { teamRouter } from "./team";
import { userRouter } from "./user";

/**
 * Main App Router
 *
 * Composed of feature-specific sub-routers:
 *
 * CORE:
 * - team: Team management, members, and invites
 * - user: User profile and settings
 *
 * INTEGRATIONS:
 * - apps: Connector management (connectors, sync, tools, identities, groups, resources)
 *
 * SEARCH & DISCOVERY:
 * - search: Search and discovery operations
 * - documents: Document CRUD operations
 * - people: Directory and people search
 *
 * AI & CHAT:
 * - chat: Conversations and AI assistants
 * TODO: AI package will be added for advanced AI features
 *
 * ORGANIZATION:
 * - collections: Collections and bookmarks
 *
 * AUTOMATION:
 * - actions: MCP tools and actions
 *
 * ANALYTICS:
 * - analytics: Usage metrics and tracking
 *
 * SETTINGS:
 * - preferences: User preferences and personalization
 *
 * ACCESS CONTROL:
 * - permissions: Permission policies, groups, and ACL
 * - apiKeys: API key management for SDKs
 *
 * ENTERPRISE:
 * - enterprise: SSO, compliance, branding, and feature flags
 */
export const appRouter = createTRPCRouter({
  // Core
  team: teamRouter,
  user: userRouter,

  // Integration management
  apps: appsRouter,

  // Search & Discovery
  search: searchRouter,
  documents: documentsRouter,
  people: peopleRouter,

  // AI & Chat
  chat: chatRouter,
  // TODO: Add ai router for advanced AI features (agents, prompts, model config)

  // Organization
  collections: collectionsRouter,

  // Actions & Automation
  actions: actionsRouter,

  // Analytics & Metrics
  analytics: analyticsRouter,

  // Personalization
  preferences: preferencesRouter,

  // Access Control
  permissions: permissionsRouter,
  apiKeys: apiKeysRouter,

  // Enterprise
  enterprise: enterpriseRouter,
});

// Type exports for client usage
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

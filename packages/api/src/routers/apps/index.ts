/**
 * Apps Router
 * Comprehensive connector and integration management
 *
 * Structure:
 * - connectors: Connector CRUD operations
 * - sync: Sync operations and settings
 * - webhooks: Webhook status and configuration
 * - tools: MCP tool management
 * - identities: External identity management
 * - groups: External group management
 * - resources: Connector resource management (channels, folders, etc.)
 * - audit: Audit logs and sync events
 */

import { createTRPCRouter } from "../../index";
import { auditRouter } from "./audit";
import { connectorsRouter } from "./connectors";
import { groupsRouter } from "./groups";
import { identitiesRouter } from "./identities";
import { resourcesRouter } from "./resources";
import { syncRouter } from "./sync";
import { toolsRouter } from "./tools";
import { webhooksRouter } from "./webhooks";

export const appsRouter = createTRPCRouter({
  // Core connector management
  connectors: connectorsRouter,
  sync: syncRouter,
  webhooks: webhooksRouter,

  // Advanced features
  tools: toolsRouter,
  identities: identitiesRouter,
  groups: groupsRouter,
  resources: resourcesRouter,
  audit: auditRouter,

  // Backward compatibility: Flat structure aliases
  // These are deprecated - use nested structure instead
  list: connectorsRouter.list,
  get: connectorsRouter.get,
  connect: connectorsRouter.connect,
  disconnect: connectorsRouter.disconnect,
  updateSettings: connectorsRouter.updateSettings,
  pauseConnector: connectorsRouter.pause,
  resumeConnector: connectorsRouter.resume,
  getSyncStatus: syncRouter.getStatus,
  getSyncHistory: syncRouter.getHistory,
  triggerSync: syncRouter.trigger,
  updateSyncSettings: syncRouter.updateSettings,
  getWebhookStatus: webhooksRouter.getStatus,
});

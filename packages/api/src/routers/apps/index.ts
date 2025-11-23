import { createTRPCRouter } from "../../index";
import { connectorsRouter } from "./connectors";
import { syncRouter } from "./sync";
import { webhooksRouter } from "./webhooks";

/**
 * Apps router - composed of feature-specific sub-routers
 *
 * New nested structure:
 * - connectors: Connector CRUD operations
 * - sync: Sync operations and settings
 * - webhooks: Webhook status and configuration
 *
 * Backward compatibility: Old flat structure is maintained via router composition
 */
export const appsRouter = createTRPCRouter({
  // New nested structure
  connectors: connectorsRouter,
  sync: syncRouter,
  webhooks: webhooksRouter,

  // Backward compatibility: Flat structure aliases
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

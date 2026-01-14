export * from "./connectors";
export * from "./context";
export * from "./data";
export * from "./documents";
export * from "./integrations";
export * from "./media";
export * from "./memory";
export * from "./overview";
export * from "./preferences";
export * from "./rag";
export * from "./search";
export * from "./storage";
export * from "./system";

import { toolSearchTool } from "../search";
import { registerConnectorTools } from "./connectors";
import { registerContextTools } from "./context";
import { registerDataTools } from "./data";
import { registerDocumentTools } from "./documents";
import { registerIntegrationTools } from "./integrations";
import { registerMediaTools } from "./media";
import { registerMemoryTools } from "./memory";
import { registerOverviewTools } from "./overview";
import { registerPreferencesTools } from "./preferences";
import { registerRagTools } from "./rag";
import { registerSearchTools } from "./search";
import { registerStorageTools } from "./storage";
import { registerSystemTools } from "./system";

let registered = false;

export function registerAllTools(): void {
  if (registered) {
    return;
  }

  registerSearchTools();
  registerRagTools();
  registerDocumentTools();
  registerConnectorTools();
  registerDataTools();
  registerContextTools();
  registerMemoryTools();
  registerOverviewTools();
  registerPreferencesTools();
  registerSystemTools();
  registerStorageTools();
  registerMediaTools();
  registerIntegrationTools();
  toolSearchTool.register();

  registered = true;
}

export { registerContextTools };

export function resetToolRegistration(): void {
  registered = false;
}

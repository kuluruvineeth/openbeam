export * from "./connectors";
export * from "./context";
export * from "./data";
export * from "./documents";
export * from "./rag";
export * from "./search";

import { toolSearchTool } from "../search";
import { registerConnectorTools } from "./connectors";
import { registerContextTools } from "./context";
import { registerDataTools } from "./data";
import { registerDocumentTools } from "./documents";
import { registerRagTools } from "./rag";
import { registerSearchTools } from "./search";

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
  toolSearchTool.register();

  registered = true;
}

export { registerContextTools };

export function resetToolRegistration(): void {
  registered = false;
}

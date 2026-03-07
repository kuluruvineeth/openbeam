export * from "./browser";
export * from "./canvas";
export * from "./connectors";
export * from "./context";
export * from "./control";
export * from "./data";
export * from "./documents";
export * from "./integrations";
export * from "./media";
export * from "./memory";
export * from "./overview";
export * from "./preferences";
export * from "./rag";
export * from "./sandbox";
export * from "./search";
export * from "./storage";
export * from "./system";
export * from "./visualization";
export * from "./voice";
export * from "./workspace";

import { toolSearchTool } from "../search";
import { registerBrowserTools } from "./browser";
import { registerCanvasTools } from "./canvas";
import { registerConnectorTools } from "./connectors";
import { registerContextTools } from "./context";
import { registerControlTools } from "./control";
import { registerDataTools } from "./data";
import { registerDocumentTools } from "./documents";
import { registerIntegrationTools } from "./integrations";
import { registerMediaTools } from "./media";
import { registerMemoryTools } from "./memory";
import { registerOverviewTools } from "./overview";
import { registerPreferencesTools } from "./preferences";
import { registerRagTools } from "./rag";
import { registerSandboxTools } from "./sandbox";
import { registerSearchTools } from "./search";
import { registerStorageTools } from "./storage";
import { registerSystemTools } from "./system";
import { registerVisualizationTools } from "./visualization";
import { registerVoiceTools } from "./voice";
import { registerWorkspaceTools } from "./workspace";

let registered = false;

type RegistrationEntry = [string, () => void];

const TOOL_CATEGORIES: RegistrationEntry[] = [
  ["search", registerSearchTools],
  ["rag", registerRagTools],
  ["documents", registerDocumentTools],
  ["connectors", registerConnectorTools],
  ["control", registerControlTools],
  ["data", registerDataTools],
  ["context", registerContextTools],
  ["memory", registerMemoryTools],
  ["overview", registerOverviewTools],
  ["preferences", registerPreferencesTools],
  ["system", registerSystemTools],
  ["storage", registerStorageTools],
  ["media", registerMediaTools],
  ["integrations", registerIntegrationTools],
  ["browser", registerBrowserTools],
  ["canvas", registerCanvasTools],
  ["visualization", registerVisualizationTools],
  ["voice", registerVoiceTools],
  ["workspace", registerWorkspaceTools],
  ["sandbox", registerSandboxTools],
];

export function registerAllTools(): number {
  if (registered) {
    return -1;
  }

  const failed: string[] = [];

  for (const [category, register] of TOOL_CATEGORIES) {
    try {
      register();
    } catch (err) {
      failed.push(category);
      console.error(
        `[registerAllTools] Failed to register ${category} tools:`,
        err
      );
    }
  }

  try {
    toolSearchTool.register();
  } catch (err) {
    failed.push("tool_search");
    console.error("[registerAllTools] Failed to register tool_search:", err);
  }

  registered = failed.length < TOOL_CATEGORIES.length;

  return failed.length;
}

export { registerContextTools };

export function resetToolRegistration(): void {
  registered = false;
}

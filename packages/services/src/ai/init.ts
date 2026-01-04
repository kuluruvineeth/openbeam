import { type ContextOrchestrator, toolRegistry } from "@openplane/ai";
import { logger } from "../lib/logger";
import { createToolServices, type ToolServicesOptions } from "./tool-binder";

let initialized = false;

export interface AIInitOptions {
  orchestrator?: ContextOrchestrator;
  enableMetrics?: boolean;
}

export function initializeAI(options: AIInitOptions = {}): void {
  if (initialized) {
    return;
  }

  const serviceOptions: ToolServicesOptions = {
    orchestrator: options.orchestrator,
  };

  const services = createToolServices(serviceOptions);
  toolRegistry.bindServices(services);

  if (options.enableMetrics) {
    toolRegistry.onExecute((tool, _params, result, durationMs) => {
      const success =
        result != null &&
        typeof result === "object" &&
        "success" in result &&
        result.success === true;

      logger.info(
        {
          tool: tool.metadata.name,
          category: tool.metadata.category,
          success,
          durationMs,
        },
        "Tool executed"
      );
    });
  }

  initialized = true;
  logger.info({ toolCount: toolRegistry.size() }, "AI services initialized");
}

export function isAIInitialized(): boolean {
  return initialized;
}

export function resetAIInitialization(): void {
  initialized = false;
}

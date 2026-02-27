import type { Logger } from "pino";
import type {
  AgentClient,
  AgentModelDefinition,
  AgentProvider,
  ListModelsOptions,
} from "./agent-sdk-types.js";
import type { AgentProviderRuntimeSettingsMap } from "./provider-launch-config.js";
import {
  AGENT_PROVIDER_DEFINITIONS,
  type AgentProviderDefinition,
  getAgentProviderDefinition,
} from "./provider-manifest.js";
import { ClaudeAgentClient } from "./providers/claude-agent.js";
import { CodexAppServerAgentClient } from "./providers/codex-app-server-agent.js";
import {
  OpenCodeAgentClient,
  OpenCodeServerManager,
} from "./providers/opencode-agent.js";

export type { AgentProviderDefinition };

export { AGENT_PROVIDER_DEFINITIONS, getAgentProviderDefinition };

export interface ProviderDefinition extends AgentProviderDefinition {
  createClient: (logger: Logger) => AgentClient;
  fetchModels: (options?: ListModelsOptions) => Promise<AgentModelDefinition[]>;
}

type BuildProviderRegistryOptions = {
  runtimeSettings?: AgentProviderRuntimeSettingsMap;
};

export function buildProviderRegistry(
  logger: Logger,
  options?: BuildProviderRegistryOptions
): Record<AgentProvider, ProviderDefinition> {
  const runtimeSettings = options?.runtimeSettings;
  const claudeClient = new ClaudeAgentClient({
    logger,
    runtimeSettings: runtimeSettings?.claude,
  });
  const codexClient = new CodexAppServerAgentClient(
    logger,
    runtimeSettings?.codex
  );
  const opencodeClient = new OpenCodeAgentClient(
    logger,
    runtimeSettings?.opencode
  );

  return {
    claude: {
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      ...AGENT_PROVIDER_DEFINITIONS.find((d) => d.id === "claude")!,
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      createClient: (logger: Logger) =>
        new ClaudeAgentClient({
          logger,
          runtimeSettings: runtimeSettings?.claude,
        }),
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      fetchModels: (options) => claudeClient.listModels(options),
    },
    codex: {
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      ...AGENT_PROVIDER_DEFINITIONS.find((d) => d.id === "codex")!,
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      createClient: (logger: Logger) =>
        new CodexAppServerAgentClient(logger, runtimeSettings?.codex),
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      fetchModels: (options) => codexClient.listModels(options),
    },
    opencode: {
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      ...AGENT_PROVIDER_DEFINITIONS.find((d) => d.id === "opencode")!,
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      createClient: (logger: Logger) =>
        new OpenCodeAgentClient(logger, runtimeSettings?.opencode),
      // biome-ignore lint/nursery/noShadow: intentional variable scoping
      fetchModels: (options) => opencodeClient.listModels(options),
    },
  };
}

// Deprecated: Use buildProviderRegistry instead
export const PROVIDER_REGISTRY: Record<AgentProvider, ProviderDefinition> =
  // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  null as any;

export function createAllClients(
  logger: Logger,
  options?: BuildProviderRegistryOptions
): Record<AgentProvider, AgentClient> {
  const registry = buildProviderRegistry(logger, options);
  return {
    claude: registry.claude.createClient(logger),
    codex: registry.codex.createClient(logger),
    opencode: registry.opencode.createClient(logger),
  };
}

export async function shutdownProviders(
  logger: Logger,
  options?: BuildProviderRegistryOptions
): Promise<void> {
  await OpenCodeServerManager.getInstance(
    logger,
    options?.runtimeSettings?.opencode
  ).shutdown();
}

import type { SandboxProvider, SandboxProviderType } from "../types";

export interface SandboxProviderConfig {
  provider: SandboxProviderType;
}

const PROVIDER_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedProvider = {
  provider: SandboxProvider;
  createdAt: number;
};

const providers = new Map<string, CachedProvider>();

export async function getSandboxProvider(
  config: SandboxProviderConfig
): Promise<SandboxProvider> {
  const cacheKey = config.provider;
  const cached = providers.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < PROVIDER_CACHE_TTL_MS) {
    return cached.provider;
  }

  const provider = await createProvider(config);
  providers.set(cacheKey, { provider, createdAt: Date.now() });
  return provider;
}

async function createProvider(
  config: SandboxProviderConfig
): Promise<SandboxProvider> {
  switch (config.provider) {
    case "daytona": {
      const { DaytonaSandboxProvider } = await import("./daytona");
      return new DaytonaSandboxProvider();
    }
    case "local": {
      const { LocalSandboxProvider } = await import("./local");
      return new LocalSandboxProvider();
    }
    default:
      throw new Error(`Unknown sandbox provider: ${config.provider}`);
  }
}

export async function detectBestProvider(): Promise<SandboxProviderType> {
  try {
    const { DaytonaSandboxProvider } = await import("./daytona");
    const provider = new DaytonaSandboxProvider();
    if (await provider.isAvailable()) {
      return "daytona";
    }
  } catch {
    /* provider unavailable */
  }

  return "local";
}

export function clearProviderCache(): void {
  providers.clear();
}

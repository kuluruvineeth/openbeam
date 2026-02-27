import {
  getSandboxProvider,
  type SandboxProvider,
  type SandboxProviderType,
} from "@openplane/sandbox";

const SANDBOX_PROVIDER_PRIORITY: readonly SandboxProviderType[] = [
  "daytona",
  "local",
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseProviderType(
  value: string | undefined
): SandboxProviderType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "daytona" || normalized === "local") {
    return normalized;
  }

  return null;
}

export function resolveSandboxProviderOrder(): SandboxProviderType[] {
  const preferred =
    parseProviderType(process.env.SANDBOX_API_PROVIDER) ??
    parseProviderType(process.env.SANDBOX_DEFAULT_PROVIDER);

  if (!preferred) {
    return [...SANDBOX_PROVIDER_PRIORITY];
  }

  return [
    preferred,
    ...SANDBOX_PROVIDER_PRIORITY.filter((provider) => provider !== preferred),
  ];
}

export async function resolveAvailableSandboxProvider(): Promise<SandboxProvider> {
  const failures: string[] = [];

  for (const providerType of resolveSandboxProviderOrder()) {
    try {
      const provider = await getSandboxProvider({ provider: providerType });
      const available = await provider.isAvailable();
      if (available) {
        return provider;
      }
      failures.push(`${providerType}: unavailable`);
    } catch (error) {
      failures.push(`${providerType}: ${toErrorMessage(error)}`);
    }
  }

  const detail =
    failures.length > 0 ? ` (${failures.join("; ")})` : " (no providers)";
  throw new Error(`No sandbox provider available${detail}`);
}

export async function getAvailableSandboxProviders(): Promise<
  SandboxProvider[]
> {
  const providers: SandboxProvider[] = [];
  const suppressedErrors: string[] = [];

  for (const providerType of resolveSandboxProviderOrder()) {
    try {
      const provider = await getSandboxProvider({ provider: providerType });
      if (await provider.isAvailable()) {
        providers.push(provider);
      }
    } catch (error) {
      suppressedErrors.push(toErrorMessage(error));
    }
  }

  if (suppressedErrors.length > 0 && providers.length === 0) {
    return [];
  }

  return providers;
}

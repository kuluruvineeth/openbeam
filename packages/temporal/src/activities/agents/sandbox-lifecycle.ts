import type { SandboxConfig as RuntimeSandboxConfig } from "@openplane/sandbox";
import {
  getAvailableSandboxProviders,
  resolveAvailableSandboxProvider,
} from "./sandbox-provider";

interface SandboxConfig {
  template?: string;
  timeout?: number;
  memoryMb?: number;
  cpuCores?: number;
  internetAccess?: boolean;
  envVars?: Record<string, string>;
}

const TRAILING_SLASH_REGEX = /\/+$/;

export interface ProvisionSandboxInput {
  teamId: string;
  sandboxConfig?: SandboxConfig;
}

export interface ProvisionSandboxOutput {
  sandboxId: string;
  host: string;
}

export interface DestroySandboxInput {
  sandboxId: string;
  teamId?: string;
}

interface GatewaySandboxInfo {
  id: string;
  host?: string;
}

function getSandboxApiBaseUrl(): string | undefined {
  const raw = process.env.SANDBOX_API_BASE_URL?.trim();
  if (!raw) {
    return;
  }
  return raw.replace(TRAILING_SLASH_REGEX, "");
}

function getSandboxApiProviderQuery(): string {
  const provider = process.env.SANDBOX_API_PROVIDER?.trim();
  if (!provider) {
    return "";
  }
  return `?provider=${encodeURIComponent(provider)}`;
}

function buildGatewayHeaders(teamId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-openplane-team-id": teamId,
  };

  const token = process.env.SANDBOX_API_TOKEN?.trim();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

async function callSandboxApi<T>(
  method: string,
  path: string,
  teamId: string,
  body?: unknown
): Promise<T> {
  const baseUrl = getSandboxApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Sandbox API base URL is not configured");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: buildGatewayHeaders(teamId),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "unknown error");
    throw new Error(
      `Sandbox API request failed (${response.status}): ${payload}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function provisionViaSandboxApi(
  input: ProvisionSandboxInput
): Promise<ProvisionSandboxOutput> {
  const sandbox = await callSandboxApi<GatewaySandboxInfo>(
    "POST",
    `/sandboxes${getSandboxApiProviderQuery()}`,
    input.teamId,
    {
      provider: process.env.SANDBOX_API_PROVIDER,
      template: input.sandboxConfig?.template,
      timeout: input.sandboxConfig?.timeout,
      memoryMb: input.sandboxConfig?.memoryMb,
      cpuCores: input.sandboxConfig?.cpuCores,
      internetAccess: input.sandboxConfig?.internetAccess,
      envVars: input.sandboxConfig?.envVars,
    }
  );

  return {
    sandboxId: sandbox.id,
    host: sandbox.host ?? `sandbox-${sandbox.id}`,
  };
}

function normalizeTimeoutMs(timeout: number | undefined): number {
  if (!(timeout && Number.isFinite(timeout)) || timeout <= 0) {
    return 300_000;
  }

  if (timeout < 1000) {
    return Math.round(timeout * 1000);
  }

  return Math.round(timeout);
}

function toRuntimeConfig(
  teamId: string,
  provider: "daytona" | "local",
  config: SandboxConfig | undefined
): RuntimeSandboxConfig {
  return {
    provider,
    template: config?.template ?? "base",
    timeout: normalizeTimeoutMs(config?.timeout),
    memoryMb: config?.memoryMb ?? 1024,
    cpuCores: config?.cpuCores ?? 1,
    diskMb: 10_240,
    internetAccess: config?.internetAccess ?? true,
    envVars: config?.envVars,
    teamId,
  };
}

async function destroyViaSandboxApi(input: DestroySandboxInput): Promise<void> {
  if (!input.teamId) {
    throw new Error("teamId is required for sandbox API destroy");
  }
  await callSandboxApi(
    "DELETE",
    `/sandboxes/${encodeURIComponent(input.sandboxId)}${getSandboxApiProviderQuery()}`,
    input.teamId
  );
}

export async function provisionSandbox(
  input: ProvisionSandboxInput
): Promise<ProvisionSandboxOutput> {
  if (getSandboxApiBaseUrl()) {
    return provisionViaSandboxApi(input);
  }

  const provider = await resolveAvailableSandboxProvider();
  const sandbox = await provider.create(
    toRuntimeConfig(input.teamId, provider.type, input.sandboxConfig)
  );
  const info = await sandbox.getInfo();
  return {
    sandboxId: sandbox.id,
    host: info.host ?? `sandbox-${sandbox.id}`,
  };
}

export interface SandboxLifecycleActivities {
  provisionSandbox: typeof provisionSandbox;
  destroySandbox: typeof destroySandbox;
}

export async function destroySandbox(
  input: DestroySandboxInput
): Promise<void> {
  if (getSandboxApiBaseUrl()) {
    await destroyViaSandboxApi(input);
    return;
  }

  const providers = await getAvailableSandboxProviders();
  const destroyErrors: string[] = [];
  for (const provider of providers) {
    try {
      await provider.destroy(input.sandboxId);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      destroyErrors.push(`${provider.type}: ${message}`);
    }
  }

  if (destroyErrors.length > 0) {
    console.warn(
      `[sandbox-lifecycle] destroy had ${destroyErrors.length} error(s) for ${input.sandboxId}: ${destroyErrors.join("; ")}`
    );
  }
}

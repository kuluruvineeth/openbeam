import type { Sandbox, SandboxConfig, SandboxInfo } from "./sandbox";

export interface E2BSandboxProviderConfig {
  apiKey?: string;
  accessToken?: string;
  domain?: string;
  apiUrl?: string;
  sandboxUrl?: string;
}

export class E2BSandboxProvider {
  readonly name = "E2B";
  readonly type = "e2b" as const;

  private readonly apiKey: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly domain: string | undefined;
  private readonly apiUrl: string | undefined;
  private readonly sandboxUrl: string | undefined;

  constructor(config: E2BSandboxProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.E2B_API_KEY || undefined;
    this.accessToken =
      config.accessToken || process.env.E2B_ACCESS_TOKEN || undefined;
    this.domain = config.domain || process.env.E2B_DOMAIN || undefined;
    this.apiUrl = config.apiUrl;
    this.sandboxUrl = config.sandboxUrl;

    if (!(this.apiKey || this.accessToken)) {
      throw new Error("E2B_API_KEY or E2B_ACCESS_TOKEN is required");
    }
  }

  get isSelfHosted(): boolean {
    return Boolean(this.domain);
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(Boolean(this.apiKey || this.accessToken));
  }

  create(_config?: SandboxConfig): Promise<Sandbox> {
    return Promise.reject(
      new Error("E2B sandbox creation not yet implemented")
    );
  }

  connect(_sandboxId: string): Promise<Sandbox> {
    return Promise.reject(
      new Error("E2B sandbox connection not yet implemented")
    );
  }

  list(): Promise<SandboxInfo[]> {
    return Promise.reject(new Error("E2B sandbox listing not yet implemented"));
  }
}

let singletonProvider: E2BSandboxProvider | undefined;

export function getE2BSandboxProvider(
  config?: E2BSandboxProviderConfig
): E2BSandboxProvider {
  if (config) {
    singletonProvider = new E2BSandboxProvider(config);
    return singletonProvider;
  }

  if (!singletonProvider) {
    singletonProvider = new E2BSandboxProvider({});
  }

  return singletonProvider;
}

export function resetE2BSandboxProvider(): void {
  singletonProvider = undefined;
}

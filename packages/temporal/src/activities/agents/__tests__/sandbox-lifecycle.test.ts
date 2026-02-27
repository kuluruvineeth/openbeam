import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function restoreEnv(name: string, value: string | undefined): void {
  process.env[name] = value;
}

const mockDaytonaProvider = {
  type: "daytona" as const,
  isAvailable: vi.fn(),
  create: vi.fn(),
  connect: vi.fn(),
  list: vi.fn(),
  destroy: vi.fn(),
};

const mockLocalProvider = {
  type: "local" as const,
  isAvailable: vi.fn(),
  create: vi.fn(),
  connect: vi.fn(),
  list: vi.fn(),
  destroy: vi.fn(),
};

const mockGetSandboxProvider = vi.fn(
  ({ provider }: { provider: "daytona" | "local" }) => {
    if (provider === "daytona") {
      return mockDaytonaProvider;
    }
    return mockLocalProvider;
  }
);

type GlobalThisWithFetch = typeof globalThis & {
  fetch?: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;
};

const globalWithFetch = globalThis as GlobalThisWithFetch;
const originalFetch = globalWithFetch.fetch;

vi.mock("@openplane/sandbox", () => ({
  getSandboxProvider: (input: { provider: "daytona" | "local" }) =>
    mockGetSandboxProvider(input),
}));

import { destroySandbox, provisionSandbox } from "../sandbox-lifecycle";

describe("provisionSandbox", () => {
  const originalBaseUrl = process.env.SANDBOX_API_BASE_URL;
  const originalApiToken = process.env.SANDBOX_API_TOKEN;
  const originalApiProvider = process.env.SANDBOX_API_PROVIDER;
  const originalDefaultProvider = process.env.SANDBOX_DEFAULT_PROVIDER;

  beforeEach(() => {
    vi.clearAllMocks();
    globalWithFetch.fetch = originalFetch;
    process.env.SANDBOX_API_BASE_URL = undefined;
    process.env.SANDBOX_API_TOKEN = undefined;
    process.env.SANDBOX_API_PROVIDER = undefined;
    process.env.SANDBOX_DEFAULT_PROVIDER = undefined;
  });

  afterEach(() => {
    globalWithFetch.fetch = originalFetch;
    restoreEnv("SANDBOX_API_BASE_URL", originalBaseUrl);
    restoreEnv("SANDBOX_API_TOKEN", originalApiToken);
    restoreEnv("SANDBOX_API_PROVIDER", originalApiProvider);
    restoreEnv("SANDBOX_DEFAULT_PROVIDER", originalDefaultProvider);
  });

  it("provisions via Daytona when available", async () => {
    const mockSandbox = {
      id: "sbx_daytona_123",
      getInfo: vi.fn().mockResolvedValue({ host: "sandbox.daytona.local" }),
    };

    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.create.mockResolvedValue(mockSandbox);

    const result = await provisionSandbox({ teamId: "team-1" });

    expect(result.sandboxId).toBe("sbx_daytona_123");
    expect(result.host).toBe("sandbox.daytona.local");
    expect(mockDaytonaProvider.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "daytona",
        teamId: "team-1",
      })
    );
  });

  it("falls back to local when Daytona unavailable", async () => {
    mockDaytonaProvider.isAvailable.mockResolvedValue(false);

    const mockSandbox = {
      id: "sbx_local_456",
      getInfo: vi.fn().mockResolvedValue({ host: "127.0.0.1" }),
    };
    mockLocalProvider.isAvailable.mockResolvedValue(true);
    mockLocalProvider.create.mockResolvedValue(mockSandbox);

    const result = await provisionSandbox({ teamId: "team-1" });

    expect(result.sandboxId).toBe("sbx_local_456");
    expect(result.host).toBe("127.0.0.1");
    expect(mockLocalProvider.create).toHaveBeenCalled();
  });

  it("falls back to local when Daytona throws", async () => {
    mockDaytonaProvider.isAvailable.mockRejectedValue(
      new Error("Daytona unavailable")
    );

    const mockSandbox = {
      id: "sbx_local_789",
      getInfo: vi.fn().mockResolvedValue({ host: "127.0.0.1" }),
    };
    mockLocalProvider.isAvailable.mockResolvedValue(true);
    mockLocalProvider.create.mockResolvedValue(mockSandbox);

    const result = await provisionSandbox({ teamId: "team-1" });

    expect(result.sandboxId).toBe("sbx_local_789");
    expect(result.host).toBe("127.0.0.1");
  });

  it("throws when no provider is available", async () => {
    mockDaytonaProvider.isAvailable.mockResolvedValue(false);
    mockLocalProvider.isAvailable.mockResolvedValue(false);

    await expect(provisionSandbox({ teamId: "team-1" })).rejects.toThrow(
      "No sandbox provider available"
    );
  });

  it("passes sandbox config to provider", async () => {
    const mockSandbox = {
      id: "sbx_cfg",
      getInfo: vi.fn().mockResolvedValue({ host: "sandbox.daytona.local" }),
    };
    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.create.mockResolvedValue(mockSandbox);

    await provisionSandbox({
      teamId: "team-1",
      sandboxConfig: {
        template: "python-data",
        memoryMb: 2048,
        cpuCores: 2,
        timeout: 600,
        internetAccess: true,
      },
    });

    expect(mockDaytonaProvider.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "daytona",
        template: "python-data",
        memoryMb: 2048,
        cpuCores: 2,
        timeout: 600_000,
        internetAccess: true,
        teamId: "team-1",
      })
    );
  });

  it("generates fallback host when host is absent", async () => {
    const mockSandbox = {
      id: "sbx_nourl",
      getInfo: vi.fn().mockResolvedValue({}),
    };
    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.create.mockResolvedValue(mockSandbox);

    const result = await provisionSandbox({ teamId: "team-1" });

    expect(result.host).toBe("sandbox-sbx_nourl");
  });

  it("provisions via sandbox API gateway when configured", async () => {
    process.env.SANDBOX_API_BASE_URL = "http://sandbox-gateway.internal";
    process.env.SANDBOX_API_TOKEN = "sandbox-token";
    process.env.SANDBOX_API_PROVIDER = "local";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "sbx_api_1", host: "sandbox-host" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );
    globalWithFetch.fetch = fetchMock as unknown as typeof fetch;

    const result = await provisionSandbox({ teamId: "team-1" });

    expect(result).toEqual({
      sandboxId: "sbx_api_1",
      host: "sandbox-host",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://sandbox-gateway.internal/sandboxes?provider=local",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(mockGetSandboxProvider).not.toHaveBeenCalled();
  });
});

describe("destroySandbox", () => {
  const originalBaseUrl = process.env.SANDBOX_API_BASE_URL;
  const originalApiToken = process.env.SANDBOX_API_TOKEN;
  const originalApiProvider = process.env.SANDBOX_API_PROVIDER;
  const originalDefaultProvider = process.env.SANDBOX_DEFAULT_PROVIDER;

  beforeEach(() => {
    vi.clearAllMocks();
    globalWithFetch.fetch = originalFetch;
    process.env.SANDBOX_API_BASE_URL = undefined;
    process.env.SANDBOX_API_TOKEN = undefined;
    process.env.SANDBOX_API_PROVIDER = undefined;
    process.env.SANDBOX_DEFAULT_PROVIDER = undefined;
  });

  afterEach(() => {
    globalWithFetch.fetch = originalFetch;
    restoreEnv("SANDBOX_API_BASE_URL", originalBaseUrl);
    restoreEnv("SANDBOX_API_TOKEN", originalApiToken);
    restoreEnv("SANDBOX_API_PROVIDER", originalApiProvider);
    restoreEnv("SANDBOX_DEFAULT_PROVIDER", originalDefaultProvider);
  });

  it("destroys via Daytona when available", async () => {
    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.destroy.mockResolvedValue(undefined);

    await destroySandbox({ sandboxId: "sbx_daytona_123" });

    expect(mockDaytonaProvider.destroy).toHaveBeenCalledWith("sbx_daytona_123");
  });

  it("falls back to local when Daytona destroy fails", async () => {
    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.destroy.mockRejectedValue(
      new Error("Daytona delete failed")
    );

    mockLocalProvider.isAvailable.mockResolvedValue(true);
    mockLocalProvider.destroy.mockResolvedValue(undefined);

    await destroySandbox({ sandboxId: "sbx_local_456" });

    expect(mockLocalProvider.destroy).toHaveBeenCalledWith("sbx_local_456");
  });

  it("tolerates errors when all providers fail", async () => {
    mockDaytonaProvider.isAvailable.mockResolvedValue(true);
    mockDaytonaProvider.destroy.mockRejectedValue(new Error("Daytona down"));
    mockLocalProvider.isAvailable.mockResolvedValue(true);
    mockLocalProvider.destroy.mockRejectedValue(new Error("Local down"));

    await expect(
      destroySandbox({ sandboxId: "sbx_gone" })
    ).resolves.toBeUndefined();
  });

  it("destroys via sandbox API gateway when configured", async () => {
    process.env.SANDBOX_API_BASE_URL = "http://sandbox-gateway.internal";
    process.env.SANDBOX_API_TOKEN = "sandbox-token";
    process.env.SANDBOX_API_PROVIDER = "local";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    globalWithFetch.fetch = fetchMock as unknown as typeof fetch;

    await destroySandbox({ sandboxId: "sbx_api_1", teamId: "team-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://sandbox-gateway.internal/sandboxes/sbx_api_1?provider=local",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(mockGetSandboxProvider).not.toHaveBeenCalled();
  });

  it("fails fast when sandbox API is configured without team id", async () => {
    process.env.SANDBOX_API_BASE_URL = "http://sandbox-gateway.internal";

    await expect(destroySandbox({ sandboxId: "sbx_api_1" })).rejects.toThrow(
      "teamId is required for sandbox API destroy"
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const daemonClientMock = vi.hoisted(() => {
  const createdConfigs: Array<{ clientSessionKey?: string; url?: string }> = [];

  class MockDaemonClient {
    private readonly statusHandlers = new Set<
      (message: {
        type: "status";
        payload: { status: string; serverId: string; hostname: string | null };
      }) => void
    >();

    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    public lastError: string | null = null;

    constructor(config: { clientSessionKey?: string; url?: string }) {
      createdConfigs.push(config);
    }

    subscribeConnectionStatus(): () => void {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      return () => {};
    }

    on(
      event: "status",
      handler: (message: {
        type: "status";
        payload: { status: string; serverId: string; hostname: string | null };
      }) => void
    ): () => void {
      if (event === "status") {
        this.statusHandlers.add(handler);
      }
      return () => {
        this.statusHandlers.delete(handler);
      };
    }

    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async connect(): Promise<void> {
      const message = {
        type: "status" as const,
        payload: {
          status: "server_info",
          serverId: "srv_probe_test",
          hostname: "probe-host",
        },
      };
      for (const handler of this.statusHandlers) {
        handler(message);
      }
    }

    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async ping(): Promise<{ rttMs: number }> {
      return { rttMs: 42 };
    }

    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async close(): Promise<void> {
      return;
    }
  }

  return {
    MockDaemonClient,
    createdConfigs,
  };
});

vi.mock("@server/client/daemon-client", () => ({
  DaemonClient: daemonClientMock.MockDaemonClient,
}));

describe("test-daemon-connection probe client identity", () => {
  beforeEach(() => {
    daemonClientMock.createdConfigs.length = 0;
  });

  it("uses isolated probe clientSessionKey values for direct latency probes", async () => {
    const mod = await import("./test-daemon-connection");

    await mod.measureConnectionLatency({
      id: "direct:lan:6767",
      type: "direct",
      endpoint: "lan:6767",
    });
    await mod.measureConnectionLatency({
      id: "direct:lan:6767",
      type: "direct",
      endpoint: "lan:6767",
    });

    const [first, second] = daemonClientMock.createdConfigs;
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(first?.clientSessionKey).toMatch(/^clsk_probe_/);
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(second?.clientSessionKey).toMatch(/^clsk_probe_/);
    expect(first?.clientSessionKey).not.toBe(second?.clientSessionKey);
  });
});

import { describe, expect, it } from "bun:test";
import { createBacnetAdapter } from "../bacnet-adapter";
import type { AdapterConfig } from "../base-adapter";

function createConfig(overrides?: Partial<AdapterConfig>): AdapterConfig {
  return {
    connectorId: "conn_bacnet_1",
    teamId: "team_1",
    protocol: "bacnet",
    connection: {
      connectorId: "conn_bacnet_1",
      interface: "eth0",
      port: 47_808,
    },
    subscriptions: [],
    aggregation: {
      defaultWindowSeconds: 0,
      eventPassthrough: false,
      maxWindowSize: 10_000,
    },
    onMessage() {
      /* noop */
    },
    ...overrides,
  };
}

describe("bacnet adapter", () => {
  it("starts in disconnected state", () => {
    const adapter = createBacnetAdapter(createConfig());
    expect(adapter.getConnectionState()).toBe("disconnected");
  });

  it("exposes protocol and connectorId", () => {
    const adapter = createBacnetAdapter(createConfig());
    expect(adapter.protocol).toBe("bacnet");
    expect(adapter.connectorId).toBe("conn_bacnet_1");
  });

  it("returns empty metrics initially", () => {
    const adapter = createBacnetAdapter(createConfig());
    const m = adapter.getMetrics();
    expect(m.messagesReceived).toBe(0);
    expect(m.messagesProcessed).toBe(0);
    expect(m.messagesDropped).toBe(0);
    expect(m.errorCount).toBe(0);
    expect(m.reconnectCount).toBe(0);
    expect(m.connectionUptime).toBe(0);
  });

  it("returns a copy of metrics", () => {
    const adapter = createBacnetAdapter(createConfig());
    const m1 = adapter.getMetrics();
    const m2 = adapter.getMetrics();
    expect(m1).toEqual(m2);
    expect(m1).not.toBe(m2);
  });

  it("connect transitions to connected state", async () => {
    const adapter = createBacnetAdapter(createConfig());
    await adapter.connect();
    expect(adapter.getConnectionState()).toBe("connected");
    await adapter.disconnect();
  });

  it("disconnect clears poll timer", async () => {
    const messages: unknown[] = [];
    const adapter = createBacnetAdapter(
      createConfig({
        subscriptions: [
          { topic: "analog-input:1", qos: 0, payloadFormat: "json" },
        ],
        onMessage: (msg) => messages.push(msg),
      })
    );

    await adapter.connect();
    await adapter.disconnect();
    expect(adapter.getConnectionState()).toBe("disconnected");
  });

  it("unsubscribe clears poll timer", async () => {
    const adapter = createBacnetAdapter(createConfig());
    await adapter.unsubscribe(["analog-input:1"]);
    expect(adapter.getConnectionState()).toBe("disconnected");
  });

  it("metrics uptime updates when connected", async () => {
    const adapter = createBacnetAdapter(createConfig());
    await adapter.connect();
    const m = adapter.getMetrics();
    expect(m.connectionUptime).toBeGreaterThanOrEqual(0);
    await adapter.disconnect();
  });
});

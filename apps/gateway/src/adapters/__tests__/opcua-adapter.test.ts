import { describe, expect, it } from "bun:test";
import type { AdapterConfig } from "../base-adapter";
import { createOpcuaAdapter } from "../opcua-adapter";

function createConfig(overrides?: Partial<AdapterConfig>): AdapterConfig {
  return {
    connectorId: "conn_opcua_1",
    teamId: "team_1",
    protocol: "opcua",
    connection: {
      connectorId: "conn_opcua_1",
      endpointUrl: "opc.tcp://localhost:4840",
    },
    subscriptions: [],
    aggregation: { windowMs: 0, strategy: "last" },
    onMessage() {
      /* noop */
    },
    ...overrides,
  };
}

describe("opcua adapter", () => {
  it("starts in disconnected state", () => {
    const adapter = createOpcuaAdapter(createConfig());
    expect(adapter.getConnectionState()).toBe("disconnected");
  });

  it("exposes protocol and connectorId", () => {
    const adapter = createOpcuaAdapter(createConfig());
    expect(adapter.protocol).toBe("opcua");
    expect(adapter.connectorId).toBe("conn_opcua_1");
  });

  it("returns empty metrics initially", () => {
    const adapter = createOpcuaAdapter(createConfig());
    const m = adapter.getMetrics();
    expect(m.messagesReceived).toBe(0);
    expect(m.messagesProcessed).toBe(0);
    expect(m.messagesDropped).toBe(0);
    expect(m.errorCount).toBe(0);
    expect(m.reconnectCount).toBe(0);
    expect(m.connectionUptime).toBe(0);
  });

  it("returns a copy of metrics", () => {
    const adapter = createOpcuaAdapter(createConfig());
    const m1 = adapter.getMetrics();
    const m2 = adapter.getMetrics();
    expect(m1).toEqual(m2);
    expect(m1).not.toBe(m2);
  });

  it("throws when subscribing without session", () => {
    const adapter = createOpcuaAdapter(createConfig());
    expect(() =>
      adapter.subscribe([
        { topic: "ns=2;s=Temp", qos: 0, payloadFormat: "json" },
      ])
    ).toThrow("OPC-UA session not established");
  });

  it("disconnect sets state to disconnected", async () => {
    const adapter = createOpcuaAdapter(createConfig());
    await adapter.disconnect();
    expect(adapter.getConnectionState()).toBe("disconnected");
  });

  it("unsubscribe resolves without error", async () => {
    const adapter = createOpcuaAdapter(createConfig());
    await adapter.unsubscribe(["ns=2;s=Temp"]);
  });
});

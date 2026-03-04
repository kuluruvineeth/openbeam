import { describe, expect, it } from "bun:test";
import {
  type EdgeConfig,
  EdgeConfigSchema,
  FlConfigSchema,
  SearchConfigSchema,
  SlmConfigSchema,
  SyncPolicySchema,
} from "../config";

describe("SyncPolicySchema", () => {
  it("uses defaults when empty object provided", () => {
    const parsed = SyncPolicySchema.parse({});
    expect(parsed.mode).toBe("incremental");
    expect(parsed.intervalMs).toBe(300_000);
    expect(parsed.batchSize).toBe(100);
    expect(parsed.maxRetries).toBe(3);
    expect(parsed.offlineQueueMaxMb).toBe(100);
  });

  it("accepts valid overrides", () => {
    const parsed = SyncPolicySchema.parse({
      mode: "full",
      intervalMs: 60_000,
      batchSize: 50,
      bandwidthLimitKbps: 5000,
    });
    expect(parsed.mode).toBe("full");
    expect(parsed.intervalMs).toBe(60_000);
    expect(parsed.bandwidthLimitKbps).toBe(5000);
  });

  it("rejects invalid mode", () => {
    expect(() => SyncPolicySchema.parse({ mode: "turbo" })).toThrow();
  });

  it("rejects negative interval", () => {
    expect(() => SyncPolicySchema.parse({ intervalMs: -1 })).toThrow();
  });
});

describe("SearchConfigSchema", () => {
  it("uses defaults", () => {
    const parsed = SearchConfigSchema.parse({});
    expect(parsed.ftsEnabled).toBe(true);
    expect(parsed.vectorEnabled).toBe(false);
    expect(parsed.hybridAlpha).toBe(0.5);
    expect(parsed.ftsProvider).toBe("sqlite_fts5");
    expect(parsed.vectorProvider).toBe("in_memory");
  });

  it("validates alpha range", () => {
    expect(() => SearchConfigSchema.parse({ hybridAlpha: 1.5 })).toThrow();
    expect(() => SearchConfigSchema.parse({ hybridAlpha: -0.1 })).toThrow();
    expect(SearchConfigSchema.parse({ hybridAlpha: 0 }).hybridAlpha).toBe(0);
    expect(SearchConfigSchema.parse({ hybridAlpha: 1 }).hybridAlpha).toBe(1);
  });
});

describe("SlmConfigSchema", () => {
  it("defaults to disabled mock runtime", () => {
    const parsed = SlmConfigSchema.parse({});
    expect(parsed.enabled).toBe(false);
    expect(parsed.runtime).toBe("mock");
    expect(parsed.modelId).toBe("phi-3-mini");
  });

  it("validates temperature range", () => {
    expect(() => SlmConfigSchema.parse({ temperature: 3 })).toThrow();
    expect(SlmConfigSchema.parse({ temperature: 0 }).temperature).toBe(0);
  });
});

describe("FlConfigSchema", () => {
  it("defaults to disabled fedavg", () => {
    const parsed = FlConfigSchema.parse({});
    expect(parsed.enabled).toBe(false);
    expect(parsed.aggregationStrategy).toBe("fedavg");
    expect(parsed.localEpochs).toBe(5);
  });
});

describe("EdgeConfigSchema", () => {
  it("parses minimal config", () => {
    const parsed = EdgeConfigSchema.parse({
      nodeId: "node-1",
      tier: "standard",
    });
    expect(parsed.nodeId).toBe("node-1");
    expect(parsed.tier).toBe("standard");
    expect(parsed.syncPolicy.mode).toBe("incremental");
    expect(parsed.searchConfig.ftsEnabled).toBe(true);
    expect(parsed.logLevel).toBe("info");
    expect(parsed.dataDir).toBe("./data");
    expect(parsed.maxDbSizeMb).toBe(1024);
  });

  it("rejects empty nodeId", () => {
    expect(() =>
      EdgeConfigSchema.parse({ nodeId: "", tier: "standard" })
    ).toThrow();
  });

  it("parses full config with overrides", () => {
    const config: EdgeConfig = EdgeConfigSchema.parse({
      nodeId: "edge-42",
      tier: "enterprise",
      syncPolicy: { mode: "full", batchSize: 200 },
      searchConfig: { vectorEnabled: true, hybridAlpha: 0.7 },
      slmConfig: { enabled: true, runtime: "llama_cpp" },
      flConfig: { enabled: true },
      dataDir: "/opt/edge/data",
      logLevel: "debug",
      maxDbSizeMb: 4096,
    });
    expect(config.syncPolicy.mode).toBe("full");
    expect(config.searchConfig.vectorEnabled).toBe(true);
    expect(config.slmConfig.enabled).toBe(true);
    expect(config.flConfig.enabled).toBe(true);
  });
});

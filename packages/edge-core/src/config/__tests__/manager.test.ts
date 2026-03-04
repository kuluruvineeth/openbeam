import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { EdgeConfig } from "@openplane/types/edge/config";
import { EdgeConfigSchema } from "@openplane/types/edge/config";
import { EdgeConfigManager } from "../manager";

describe("EdgeConfigManager", () => {
  let db: Database;
  let manager: EdgeConfigManager;

  beforeEach(() => {
    db = new Database(":memory:");
    manager = new EdgeConfigManager(db);
  });

  afterEach(() => {
    db.close();
  });

  test("load returns default config for new node", () => {
    const config = manager.load("node-1", "standard");

    expect(config.nodeId).toBe("node-1");
    expect(config.tier).toBe("standard");
    expect(config.logLevel).toBe("info");
    expect(config.maxDbSizeMb).toBe(1024);
    expect(config.syncPolicy.mode).toBe("incremental");
    expect(config.syncPolicy.batchSize).toBe(100);
    expect(config.searchConfig.ftsEnabled).toBe(true);
    expect(config.searchConfig.vectorEnabled).toBe(false);
    expect(config.slmConfig.enabled).toBe(false);
    expect(config.flConfig.enabled).toBe(false);
  });

  test("save and load round-trip", () => {
    const config = EdgeConfigSchema.parse({
      nodeId: "node-2",
      tier: "performance",
      logLevel: "debug",
      maxDbSizeMb: 2048,
    });

    manager.save(config);
    const loaded = manager.load("node-2", "performance");

    expect(loaded.logLevel).toBe("debug");
    expect(loaded.maxDbSizeMb).toBe(2048);
  });

  test("save validates config and rejects invalid", () => {
    const invalid = {
      nodeId: "",
      tier: "standard",
    } as unknown as EdgeConfig;

    expect(() => manager.save(invalid)).toThrow();
  });

  test("update merges partial config", () => {
    const initial = manager.load("node-3", "standard");
    expect(initial.logLevel).toBe("info");

    const updated = manager.update("node-3", { logLevel: "error" });

    expect(updated.logLevel).toBe("error");
    expect(updated.nodeId).toBe("node-3");
    expect(updated.syncPolicy.mode).toBe("incremental");
  });

  test("update returns full config", () => {
    const result = manager.update("node-4", {
      maxDbSizeMb: 512,
    });

    expect(result.nodeId).toBe("node-4");
    expect(result.maxDbSizeMb).toBe(512);
    expect(result.logLevel).toBe("info");
    expect(result.syncPolicy).toBeDefined();
    expect(result.searchConfig).toBeDefined();
    expect(result.slmConfig).toBeDefined();
    expect(result.flConfig).toBeDefined();
  });

  test("onReload fires on save", () => {
    const received: EdgeConfig[] = [];
    manager.onReload((cfg) => received.push(cfg));

    const config = EdgeConfigSchema.parse({
      nodeId: "node-5",
      tier: "standard",
    });

    manager.save(config);

    expect(received).toHaveLength(1);
    expect(received[0]?.nodeId).toBe("node-5");
  });

  test("onReload fires on update", () => {
    const received: EdgeConfig[] = [];
    manager.onReload((config) => received.push(config));

    manager.update("node-6", { logLevel: "warn" });

    expect(received).toHaveLength(1);
    expect(received[0]?.logLevel).toBe("warn");
  });

  test("unsubscribe stops listener", () => {
    const received: EdgeConfig[] = [];
    const unsubscribe = manager.onReload((config) => received.push(config));

    const config1 = EdgeConfigSchema.parse({
      nodeId: "node-7",
      tier: "standard",
    });
    manager.save(config1);
    expect(received).toHaveLength(1);

    unsubscribe();

    const config2 = EdgeConfigSchema.parse({
      nodeId: "node-7",
      tier: "standard",
      logLevel: "debug",
    });
    manager.save(config2);
    expect(received).toHaveLength(1);
  });

  test("multiple listeners all fire", () => {
    const results1: EdgeConfig[] = [];
    const results2: EdgeConfig[] = [];
    manager.onReload((cfg) => results1.push(cfg));
    manager.onReload((cfg) => results2.push(cfg));

    const config = EdgeConfigSchema.parse({
      nodeId: "node-8",
      tier: "enterprise",
    });
    manager.save(config);

    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
  });

  test("load merges stored values with defaults", () => {
    const config = EdgeConfigSchema.parse({
      nodeId: "node-9",
      tier: "standard",
      logLevel: "debug",
    });
    manager.save(config);

    const loaded = manager.load("node-9", "performance");

    expect(loaded.logLevel).toBe("debug");
    expect(loaded.tier).toBe("performance");
    expect(loaded.syncPolicy.mode).toBe("incremental");
    expect(loaded.searchConfig.ftsEnabled).toBe(true);
  });

  test("save with all optional fields", () => {
    const config = EdgeConfigSchema.parse({
      nodeId: "node-10",
      tier: "enterprise",
      logLevel: "error",
      maxDbSizeMb: 4096,
      dataDir: "/custom/data",
      syncPolicy: {
        mode: "full",
        intervalMs: 600_000,
        batchSize: 200,
        maxRetries: 5,
        bandwidthLimitKbps: 1000,
        offlineQueueMaxMb: 250,
      },
      searchConfig: {
        ftsEnabled: true,
        vectorEnabled: true,
        hybridAlpha: 0.7,
        maxResults: 100,
        snippetLength: 300,
        ftsProvider: "tantivy",
        vectorProvider: "usearch",
      },
      slmConfig: {
        enabled: true,
        modelId: "phi-3-mini",
        maxTokens: 1024,
        temperature: 0.5,
        contextWindowTokens: 8192,
        runtime: "llama_cpp",
      },
      flConfig: {
        enabled: true,
        aggregationStrategy: "fedprox",
        localEpochs: 10,
        privacyBudgetEpsilon: 2.0,
      },
    });

    manager.save(config);
    const loaded = manager.load("node-10", "enterprise");

    expect(loaded.dataDir).toBe("/custom/data");
    expect(loaded.syncPolicy.mode).toBe("full");
    expect(loaded.syncPolicy.bandwidthLimitKbps).toBe(1000);
    expect(loaded.searchConfig.ftsProvider).toBe("tantivy");
    expect(loaded.searchConfig.vectorProvider).toBe("usearch");
    expect(loaded.slmConfig.enabled).toBe(true);
    expect(loaded.slmConfig.runtime).toBe("llama_cpp");
    expect(loaded.flConfig.aggregationStrategy).toBe("fedprox");
    expect(loaded.flConfig.localEpochs).toBe(10);
  });

  test("update persists across load calls", () => {
    manager.update("node-11", { logLevel: "warn", maxDbSizeMb: 2048 });

    const db2Manager = new EdgeConfigManager(db);
    const loaded = db2Manager.load("node-11", "standard");

    expect(loaded.logLevel).toBe("warn");
    expect(loaded.maxDbSizeMb).toBe(2048);
  });

  test("save overwrites previous values", () => {
    const config1 = EdgeConfigSchema.parse({
      nodeId: "node-12",
      tier: "standard",
      logLevel: "debug",
    });
    manager.save(config1);

    const config2 = EdgeConfigSchema.parse({
      nodeId: "node-12",
      tier: "standard",
      logLevel: "error",
    });
    manager.save(config2);

    const loaded = manager.load("node-12", "standard");
    expect(loaded.logLevel).toBe("error");
  });

  test("update with syncPolicy partial merges correctly", () => {
    manager.update("node-13", {
      syncPolicy: {
        mode: "full",
        intervalMs: 600_000,
        batchSize: 200,
        maxRetries: 5,
        offlineQueueMaxMb: 100,
      },
    });

    const loaded = manager.load("node-13", "standard");
    expect(loaded.syncPolicy.mode).toBe("full");
    expect(loaded.syncPolicy.intervalMs).toBe(600_000);
  });

  test("notifyReload called from save fires listeners with validated config", () => {
    const received: EdgeConfig[] = [];
    manager.onReload((cfg) => received.push(cfg));

    const config = EdgeConfigSchema.parse({
      nodeId: "node-14",
      tier: "standard",
    });
    manager.save(config);

    expect(received).toHaveLength(1);
    const parsed = EdgeConfigSchema.safeParse(received[0]);
    expect(parsed.success).toBe(true);
  });
});

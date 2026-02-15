import { beforeEach, describe, expect, it } from "vitest";
import {
  InMemoryCounter,
  InMemoryGauge,
  InMemoryHistogram,
  resetAllMetrics,
  snapshotMetrics,
  swarmMetrics,
} from "../config/metrics";

describe("InMemoryCounter", () => {
  it("increments by 1 by default", () => {
    const counter = new InMemoryCounter("test_counter", "test");
    counter.inc();
    counter.inc();
    expect(counter.get()).toBe(2);
  });

  it("increments by custom amount", () => {
    const counter = new InMemoryCounter("test_counter", "test");
    counter.inc(undefined, 5);
    expect(counter.get()).toBe(5);
  });

  it("tracks separate label sets independently", () => {
    const counter = new InMemoryCounter("test_counter", "test");
    counter.inc({ missionId: "a" });
    counter.inc({ missionId: "a" });
    counter.inc({ missionId: "b" });

    expect(counter.get({ missionId: "a" })).toBe(2);
    expect(counter.get({ missionId: "b" })).toBe(1);
  });

  it("returns 0 for unknown labels", () => {
    const counter = new InMemoryCounter("test_counter", "test");
    expect(counter.get({ missionId: "nonexistent" })).toBe(0);
  });
});

describe("InMemoryGauge", () => {
  it("sets and gets value", () => {
    const gauge = new InMemoryGauge("test_gauge", "test");
    gauge.set(42);
    expect(gauge.get()).toBe(42);
  });

  it("increments and decrements", () => {
    const gauge = new InMemoryGauge("test_gauge", "test");
    gauge.inc();
    gauge.inc();
    gauge.dec();
    expect(gauge.get()).toBe(1);
  });

  it("tracks labels independently", () => {
    const gauge = new InMemoryGauge("test_gauge", "test");
    gauge.set(10, { agent: "researcher" });
    gauge.set(20, { agent: "planner" });
    expect(gauge.get({ agent: "researcher" })).toBe(10);
    expect(gauge.get({ agent: "planner" })).toBe(20);
  });
});

describe("InMemoryHistogram", () => {
  it("records count and sum", () => {
    const histogram = new InMemoryHistogram("test_histogram", "test");
    histogram.observe(100);
    histogram.observe(200);
    histogram.observe(300);

    expect(histogram.getCount()).toBe(3);
    expect(histogram.getSum()).toBe(600);
  });

  it("tracks labels independently", () => {
    const histogram = new InMemoryHistogram("test_histogram", "test");
    histogram.observe(10, { model: "gpt-4" });
    histogram.observe(20, { model: "claude" });
    histogram.observe(30, { model: "gpt-4" });

    expect(histogram.getCount({ model: "gpt-4" })).toBe(2);
    expect(histogram.getSum({ model: "gpt-4" })).toBe(40);
    expect(histogram.getCount({ model: "claude" })).toBe(1);
  });

  it("returns 0 for unknown labels", () => {
    const histogram = new InMemoryHistogram("test_histogram", "test");
    expect(histogram.getCount({ x: "y" })).toBe(0);
    expect(histogram.getSum({ x: "y" })).toBe(0);
  });
});

describe("swarmMetrics", () => {
  beforeEach(() => {
    resetAllMetrics();
  });

  it("has all 15 expected metric keys", () => {
    const keys = Object.keys(swarmMetrics);
    expect(keys).toHaveLength(15);
    expect(keys).toContain("agentsActive");
    expect(keys).toContain("spawnTotal");
    expect(keys).toContain("spawnRejected");
    expect(keys).toContain("messagesSent");
    expect(keys).toContain("messageLatencyMs");
    expect(keys).toContain("llmCallDurationMs");
    expect(keys).toContain("llmCallErrors");
    expect(keys).toContain("budgetConsumedCents");
    expect(keys).toContain("reflectionScore");
    expect(keys).toContain("heartbeatLag");
    expect(keys).toContain("messagesRateLimited");
    expect(keys).toContain("messagesDeadLettered");
    expect(keys).toContain("messagesDeduplicated");
    expect(keys).toContain("messagesReclaimed");
    expect(keys).toContain("messagesReprocessed");
  });

  it("resetAllMetrics clears all state", () => {
    swarmMetrics.agentsActive.set(5);
    swarmMetrics.spawnTotal.inc();
    swarmMetrics.messageLatencyMs.observe(100);

    resetAllMetrics();

    expect(swarmMetrics.agentsActive.get()).toBe(0);
    expect(swarmMetrics.spawnTotal.get()).toBe(0);
    expect(swarmMetrics.messageLatencyMs.getCount()).toBe(0);
  });

  it("snapshotMetrics returns serializable JSON", () => {
    swarmMetrics.agentsActive.set(3);
    swarmMetrics.spawnTotal.inc(undefined, 7);
    swarmMetrics.llmCallDurationMs.observe(250);

    const snapshot = snapshotMetrics();

    expect(typeof snapshot).toBe("object");
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(snapshot.agentsActive).toBeDefined();
    expect(snapshot.spawnTotal).toBeDefined();
    expect(snapshot.llmCallDurationMs).toBeDefined();
  });
});

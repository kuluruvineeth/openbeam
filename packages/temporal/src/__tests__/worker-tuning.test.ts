import { describe, expect, it } from "vitest";
import {
  applyTuningToWorkerOptions,
  calculateOptimalTuning,
  getResourceSnapshot,
  getWorkerHealthMetrics,
  type ResourceSnapshot,
} from "../worker/tuning";

function createSnapshot(
  overrides: Partial<ResourceSnapshot> = {}
): ResourceSnapshot {
  return {
    cpuCount: 4,
    totalMemoryMb: 8192,
    freeMemoryMb: 4096,
    usedMemoryMb: 4096,
    memoryUsagePercent: 50,
    loadAverage: [1.0, 1.5, 2.0],
    uptimeSeconds: 3600,
    ...overrides,
  };
}

describe("calculateOptimalTuning", () => {
  it("scales activities by CPU count", () => {
    const lowCpu = calculateOptimalTuning(createSnapshot({ cpuCount: 2 }));
    const highCpu = calculateOptimalTuning(createSnapshot({ cpuCount: 16 }));

    expect(highCpu.maxConcurrentActivities).toBeGreaterThan(
      lowCpu.maxConcurrentActivities
    );
  });

  it("clamps activities to minimum of 4", () => {
    const tuning = calculateOptimalTuning(createSnapshot({ cpuCount: 1 }));
    expect(tuning.maxConcurrentActivities).toBeGreaterThanOrEqual(4);
  });

  it("clamps activities to maximum of 100", () => {
    const tuning = calculateOptimalTuning(createSnapshot({ cpuCount: 128 }));
    expect(tuning.maxConcurrentActivities).toBeLessThanOrEqual(100);
  });

  it("scales workflows by available memory", () => {
    const lowMem = calculateOptimalTuning(
      createSnapshot({ freeMemoryMb: 100 })
    );
    const highMem = calculateOptimalTuning(
      createSnapshot({ freeMemoryMb: 8000 })
    );

    expect(highMem.maxConcurrentWorkflows).toBeGreaterThan(
      lowMem.maxConcurrentWorkflows
    );
  });

  it("clamps workflows to minimum of 10", () => {
    const tuning = calculateOptimalTuning(createSnapshot({ freeMemoryMb: 50 }));
    expect(tuning.maxConcurrentWorkflows).toBeGreaterThanOrEqual(10);
  });

  it("clamps workflows to maximum of 200", () => {
    const tuning = calculateOptimalTuning(
      createSnapshot({ freeMemoryMb: 100_000 })
    );
    expect(tuning.maxConcurrentWorkflows).toBeLessThanOrEqual(200);
  });

  it("calculates cache size from total memory", () => {
    const tuning = calculateOptimalTuning(
      createSnapshot({ totalMemoryMb: 16_384 })
    );
    expect(tuning.maxCachedWorkflows).toBeGreaterThanOrEqual(50);
    expect(tuning.maxCachedWorkflows).toBeLessThanOrEqual(1000);
  });

  it("sets sticky queue timeout", () => {
    const tuning = calculateOptimalTuning(createSnapshot());
    expect(tuning.stickyQueueScheduleToStartTimeoutMs).toBe(10_000);
  });

  it("uses system resources when no snapshot provided", () => {
    const tuning = calculateOptimalTuning();
    expect(tuning.maxConcurrentActivities).toBeGreaterThanOrEqual(4);
    expect(tuning.maxConcurrentWorkflows).toBeGreaterThanOrEqual(10);
    expect(tuning.maxCachedWorkflows).toBeGreaterThanOrEqual(50);
  });
});

describe("applyTuningToWorkerOptions", () => {
  it("merges tuning into worker options", () => {
    const base = { taskQueue: "test" };
    const tuning = calculateOptimalTuning(createSnapshot({ cpuCount: 8 }));
    const result = applyTuningToWorkerOptions(base, tuning);

    expect(result.taskQueue).toBe("test");
    expect(result.maxConcurrentActivityTaskExecutions).toBe(
      tuning.maxConcurrentActivities
    );
    expect(result.maxConcurrentWorkflowTaskExecutions).toBe(
      tuning.maxConcurrentWorkflows
    );
    expect(result.maxCachedWorkflows).toBe(tuning.maxCachedWorkflows);
  });

  it("uses auto-calculated tuning when none provided", () => {
    const result = applyTuningToWorkerOptions({});
    expect(result.maxConcurrentActivityTaskExecutions).toBeGreaterThanOrEqual(
      4
    );
  });

  it("preserves existing options not related to tuning", () => {
    const base = {
      namespace: "test-ns",
      buildId: "build-123",
    };
    const result = applyTuningToWorkerOptions(base);

    expect(result.namespace).toBe("test-ns");
    expect(result.buildId).toBe("build-123");
  });
});

describe("getResourceSnapshot", () => {
  it("returns valid resource data", () => {
    const snapshot = getResourceSnapshot();

    expect(snapshot.cpuCount).toBeGreaterThan(0);
    expect(snapshot.totalMemoryMb).toBeGreaterThan(0);
    expect(snapshot.freeMemoryMb).toBeGreaterThanOrEqual(0);
    expect(snapshot.usedMemoryMb).toBeGreaterThanOrEqual(0);
    expect(snapshot.memoryUsagePercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.memoryUsagePercent).toBeLessThanOrEqual(100);
    expect(snapshot.loadAverage).toHaveLength(3);
    expect(snapshot.uptimeSeconds).toBeGreaterThan(0);
  });

  it("has consistent memory totals", () => {
    const snapshot = getResourceSnapshot();
    const calculatedUsed = snapshot.totalMemoryMb - snapshot.freeMemoryMb;
    expect(snapshot.usedMemoryMb).toBe(calculatedUsed);
  });
});

describe("getWorkerHealthMetrics", () => {
  it("returns resources and tuning config", () => {
    const metrics = getWorkerHealthMetrics();

    expect(metrics.resources).toBeDefined();
    expect(metrics.tuning).toBeDefined();
    expect(metrics.timestamp).toBeGreaterThan(0);

    expect(metrics.resources.cpuCount).toBeGreaterThan(0);
    expect(metrics.tuning.maxConcurrentActivities).toBeGreaterThanOrEqual(4);
  });
});

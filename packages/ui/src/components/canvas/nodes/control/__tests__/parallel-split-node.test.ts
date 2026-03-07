import { describe, expect, it } from "bun:test";
import {
  ParallelSplitBranchSchema,
  ParallelSplitNodeConfigSchema,
} from "@openbeam/types/canvas";
import { createParallelSplitNodeData } from "../parallel-split-node";

describe("createParallelSplitNodeData", () => {
  it("returns valid default data", () => {
    const data = createParallelSplitNodeData();

    expect(data.label).toBe("Parallel Split");
    expect(data.config.executionMode).toBe("parallel");
    expect(data.config.dataDistribution).toBe("broadcast");
  });

  it("returns three default outputs", () => {
    const data = createParallelSplitNodeData();
    const outputs = data.config.branches;

    expect(outputs).toHaveLength(3);
    expect(outputs[0]?.id).toBe("output-1");
    expect(outputs[0]?.label).toBe("Output 1");
    expect(outputs[1]?.id).toBe("output-2");
    expect(outputs[1]?.label).toBe("Output 2");
    expect(outputs[2]?.id).toBe("output-3");
    expect(outputs[2]?.label).toBe("Output 3");
  });

  it("returns correct default synchronization settings", () => {
    const data = createParallelSplitNodeData();

    expect(data.config.waitForAll).toBe(true);
    expect(data.config.timeoutMs).toBeUndefined();
  });

  it("returns correct default error handling", () => {
    const data = createParallelSplitNodeData();

    expect(data.config.errorHandling).toBe("failFast");
  });

  it("returns correct default max concurrency", () => {
    const data = createParallelSplitNodeData();

    expect(data.config.maxConcurrency).toBe(10);
  });

  it("returns correct input ports", () => {
    const data = createParallelSplitNodeData();

    expect(data.inputs).toHaveLength(1);
    expect(data.inputs?.[0]).toEqual({
      id: "input",
      label: "Input",
      type: "data",
      required: true,
    });
  });

  it("returns correct output ports matching outputs", () => {
    const data = createParallelSplitNodeData();

    expect(data.outputs).toHaveLength(3);
    expect(data.outputs?.[0]).toEqual({
      id: "output-1",
      label: "Output 1",
      type: "control",
      required: false,
    });
    expect(data.outputs?.[1]).toEqual({
      id: "output-2",
      label: "Output 2",
      type: "control",
      required: false,
    });
    expect(data.outputs?.[2]).toEqual({
      id: "output-3",
      label: "Output 3",
      type: "control",
      required: false,
    });
  });
});

describe("ParallelSplitBranchSchema", () => {
  it("validates branch with required fields", () => {
    const branch = {
      id: "branch-1",
      label: "My Branch",
    };

    const result = ParallelSplitBranchSchema.parse(branch);
    expect(result.id).toBe("branch-1");
    expect(result.label).toBe("My Branch");
  });

  it("requires id field", () => {
    const branch = {
      label: "My Branch",
    };

    expect(() => ParallelSplitBranchSchema.parse(branch)).toThrow();
  });

  it("requires label field", () => {
    const branch = {
      id: "branch-1",
    };

    expect(() => ParallelSplitBranchSchema.parse(branch)).toThrow();
  });
});

describe("ParallelSplitNodeConfigSchema", () => {
  it("validates parallel execution mode", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      executionMode: "parallel" as const,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("parallel");
  });

  it("validates sequential execution mode", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      executionMode: "sequential" as const,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("sequential");
  });

  it("validates broadcast data distribution", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "broadcast" as const,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.dataDistribution).toBe("broadcast");
  });

  it("validates roundRobin data distribution", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "roundRobin" as const,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.dataDistribution).toBe("roundRobin");
  });

  it("validates partition data distribution with key", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "partition" as const,
      partitionKey: "item.category",
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.dataDistribution).toBe("partition");
    expect(result.partitionKey).toBe("item.category");
  });

  it("validates error handling modes", () => {
    const modes = ["failFast", "continueOnError", "collectErrors"] as const;

    for (const errorHandling of modes) {
      const config = {
        branches: [
          { id: "b1", label: "Branch 1" },
          { id: "b2", label: "Branch 2" },
        ],
        errorHandling,
      };

      const result = ParallelSplitNodeConfigSchema.parse(config);
      expect(result.errorHandling).toBe(errorHandling);
    }
  });

  it("validates waitForAll setting", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      waitForAll: false,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.waitForAll).toBe(false);
  });

  it("validates timeout setting", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      timeoutMs: 30_000,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.timeoutMs).toBe(30_000);
  });

  it("validates max concurrency", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: 5,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.maxConcurrency).toBe(5);
  });

  it("applies default values", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("parallel");
    expect(result.dataDistribution).toBe("broadcast");
    expect(result.waitForAll).toBe(true);
    expect(result.errorHandling).toBe("failFast");
    expect(result.maxConcurrency).toBe(10);
  });

  it("rejects invalid execution mode", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      executionMode: "invalid",
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects invalid data distribution", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "invalid",
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects invalid error handling mode", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      errorHandling: "invalid",
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects less than 2 branches", () => {
    const config = {
      branches: [{ id: "b1", label: "Branch 1" }],
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects more than 10 branches", () => {
    const config = {
      branches: Array.from({ length: 11 }, (_, i) => ({
        id: `b${i}`,
        label: `Branch ${i}`,
      })),
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects zero max concurrency", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: 0,
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects negative max concurrency", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: -1,
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects max concurrency over 100", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: 101,
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects negative timeout", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      timeoutMs: -1,
    };

    expect(() => ParallelSplitNodeConfigSchema.parse(config)).toThrow();
  });
});

describe("parallel split config edge cases", () => {
  it("handles full config with all fields", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
        { id: "b3", label: "Branch 3" },
      ],
      executionMode: "sequential" as const,
      dataDistribution: "partition" as const,
      partitionKey: "item.type",
      waitForAll: false,
      timeoutMs: 60_000,
      errorHandling: "collectErrors" as const,
      maxConcurrency: 50,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);

    expect(result.branches).toHaveLength(3);
    expect(result.executionMode).toBe("sequential");
    expect(result.dataDistribution).toBe("partition");
    expect(result.partitionKey).toBe("item.type");
    expect(result.waitForAll).toBe(false);
    expect(result.timeoutMs).toBe(60_000);
    expect(result.errorHandling).toBe("collectErrors");
    expect(result.maxConcurrency).toBe(50);
  });

  it("allows exactly 2 branches (minimum)", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.branches).toHaveLength(2);
  });

  it("allows exactly 10 branches (maximum)", () => {
    const config = {
      branches: Array.from({ length: 10 }, (_, i) => ({
        id: `b${i}`,
        label: `Branch ${i}`,
      })),
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.branches).toHaveLength(10);
  });

  it("allows max concurrency of 1", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: 1,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.maxConcurrency).toBe(1);
  });

  it("allows max concurrency of 100", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      maxConcurrency: 100,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.maxConcurrency).toBe(100);
  });

  it("allows zero timeout", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      timeoutMs: 0,
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.timeoutMs).toBe(0);
  });

  it("handles empty partition key", () => {
    const config = {
      branches: [
        { id: "b1", label: "Branch 1" },
        { id: "b2", label: "Branch 2" },
      ],
      dataDistribution: "partition" as const,
      partitionKey: "",
    };

    const result = ParallelSplitNodeConfigSchema.parse(config);
    expect(result.partitionKey).toBe("");
  });
});

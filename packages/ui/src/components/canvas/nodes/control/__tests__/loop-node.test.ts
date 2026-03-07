import { describe, expect, it } from "bun:test";
import { LoopNodeConfigSchema } from "@openbeam/types/canvas";
import { createLoopNodeData } from "../loop-node";

describe("createLoopNodeData", () => {
  it("returns valid default data", () => {
    const data = createLoopNodeData();

    expect(data.label).toBe("Loop");
    expect(data.config.type).toBe("forEach");
    expect(data.config.maxIterations).toBe(100);
  });

  it("returns valid default execution mode", () => {
    const data = createLoopNodeData();

    expect(data.config.executionMode).toBe("sequential");
  });

  it("returns valid default batch settings", () => {
    const data = createLoopNodeData();

    expect(data.config.batchSize).toBe(10);
    expect(data.config.batchDelayMs).toBe(0);
  });

  it("returns valid default error handling", () => {
    const data = createLoopNodeData();

    expect(data.config.errorHandling).toBe("stop");
  });

  it("returns valid default output mode", () => {
    const data = createLoopNodeData();

    expect(data.config.outputMode).toBe("all");
  });

  it("returns correct input ports", () => {
    const data = createLoopNodeData();

    expect(data.inputs).toHaveLength(1);
    expect(data.inputs?.[0]).toEqual({
      id: "input",
      label: "Input",
      type: "data",
      required: true,
    });
  });

  it("returns correct output ports", () => {
    const data = createLoopNodeData();

    expect(data.outputs).toHaveLength(2);
    expect(data.outputs?.[0]).toEqual({
      id: "body",
      label: "Body",
      type: "control",
      required: false,
    });
    expect(data.outputs?.[1]).toEqual({
      id: "done",
      label: "Done",
      type: "control",
      required: false,
    });
  });
});

describe("LoopNodeConfigSchema", () => {
  it("validates forEach config", () => {
    const config = {
      type: "forEach" as const,
      collection: "input.items",
      maxIterations: 100,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.type).toBe("forEach");
    expect(result.collection).toBe("input.items");
  });

  it("validates while config", () => {
    const config = {
      type: "while" as const,
      condition: "index < 10",
      maxIterations: 50,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.type).toBe("while");
    expect(result.condition).toBe("index < 10");
  });

  it("validates times config", () => {
    const config = {
      type: "times" as const,
      times: 5,
      maxIterations: 10,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.type).toBe("times");
    expect(result.times).toBe(5);
  });

  it("validates sequential execution mode", () => {
    const config = {
      type: "forEach" as const,
      executionMode: "sequential" as const,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("sequential");
  });

  it("validates parallel execution mode", () => {
    const config = {
      type: "forEach" as const,
      executionMode: "parallel" as const,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("parallel");
  });

  it("validates batch execution mode with settings", () => {
    const config = {
      type: "forEach" as const,
      executionMode: "batch" as const,
      batchSize: 25,
      batchDelayMs: 500,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("batch");
    expect(result.batchSize).toBe(25);
    expect(result.batchDelayMs).toBe(500);
  });

  it("validates error handling modes", () => {
    const modes = ["stop", "continue", "collect"] as const;

    for (const errorHandling of modes) {
      const config = {
        type: "forEach" as const,
        errorHandling,
      };

      const result = LoopNodeConfigSchema.parse(config);
      expect(result.errorHandling).toBe(errorHandling);
    }
  });

  it("validates output modes", () => {
    const modes = ["lastOnly", "all", "aggregate"] as const;

    for (const outputMode of modes) {
      const config = {
        type: "forEach" as const,
        outputMode,
      };

      const result = LoopNodeConfigSchema.parse(config);
      expect(result.outputMode).toBe(outputMode);
    }
  });

  it("validates aggregate expression", () => {
    const config = {
      type: "forEach" as const,
      outputMode: "aggregate" as const,
      aggregateExpression: "results.reduce((a, b) => a + b, 0)",
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.outputMode).toBe("aggregate");
    expect(result.aggregateExpression).toBe(
      "results.reduce((a, b) => a + b, 0)"
    );
  });

  it("validates break condition", () => {
    const config = {
      type: "forEach" as const,
      breakCondition: "item.status === 'complete'",
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.breakCondition).toBe("item.status === 'complete'");
  });

  it("validates timeout", () => {
    const config = {
      type: "forEach" as const,
      timeoutMs: 30_000,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.timeoutMs).toBe(30_000);
  });

  it("applies default values", () => {
    const config = {
      type: "forEach" as const,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.executionMode).toBe("sequential");
    expect(result.batchSize).toBe(10);
    expect(result.batchDelayMs).toBe(0);
    expect(result.errorHandling).toBe("stop");
    expect(result.maxIterations).toBe(100);
    expect(result.outputMode).toBe("all");
  });

  it("rejects invalid execution mode", () => {
    const config = {
      type: "forEach" as const,
      executionMode: "invalid",
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects invalid error handling mode", () => {
    const config = {
      type: "forEach" as const,
      errorHandling: "invalid",
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects invalid output mode", () => {
    const config = {
      type: "forEach" as const,
      outputMode: "invalid",
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects negative batch size", () => {
    const config = {
      type: "forEach" as const,
      batchSize: -1,
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects zero batch size", () => {
    const config = {
      type: "forEach" as const,
      batchSize: 0,
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects negative batch delay", () => {
    const config = {
      type: "forEach" as const,
      batchDelayMs: -100,
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects negative max iterations", () => {
    const config = {
      type: "forEach" as const,
      maxIterations: -1,
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });

  it("rejects zero max iterations", () => {
    const config = {
      type: "forEach" as const,
      maxIterations: 0,
    };

    expect(() => LoopNodeConfigSchema.parse(config)).toThrow();
  });
});

describe("loop config edge cases", () => {
  it("handles full config with all fields", () => {
    const config = {
      type: "forEach" as const,
      collection: "data.items",
      executionMode: "batch" as const,
      batchSize: 50,
      batchDelayMs: 1000,
      errorHandling: "collect" as const,
      maxIterations: 500,
      timeoutMs: 60_000,
      breakCondition: "item.done",
      outputMode: "aggregate" as const,
      aggregateExpression: "sum(results)",
    };

    const result = LoopNodeConfigSchema.parse(config);

    expect(result.type).toBe("forEach");
    expect(result.collection).toBe("data.items");
    expect(result.executionMode).toBe("batch");
    expect(result.batchSize).toBe(50);
    expect(result.batchDelayMs).toBe(1000);
    expect(result.errorHandling).toBe("collect");
    expect(result.maxIterations).toBe(500);
    expect(result.timeoutMs).toBe(60_000);
    expect(result.breakCondition).toBe("item.done");
    expect(result.outputMode).toBe("aggregate");
    expect(result.aggregateExpression).toBe("sum(results)");
  });

  it("allows zero batch delay", () => {
    const config = {
      type: "forEach" as const,
      batchDelayMs: 0,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.batchDelayMs).toBe(0);
  });

  it("allows large batch size", () => {
    const config = {
      type: "forEach" as const,
      batchSize: 1000,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.batchSize).toBe(1000);
  });

  it("allows large max iterations", () => {
    const config = {
      type: "forEach" as const,
      maxIterations: 10_000,
    };

    const result = LoopNodeConfigSchema.parse(config);
    expect(result.maxIterations).toBe(10_000);
  });
});

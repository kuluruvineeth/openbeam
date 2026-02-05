import { describe, expect, it } from "bun:test";
import { codeExecutor } from "../code";

const createNode = (code: string, sandboxed = true) => ({
  id: "test-node",
  type: "code" as const,
  data: {
    config: {
      runtime: "javascript" as const,
      code,
      sandboxed,
      timeoutMs: 5000,
      enableConsole: false,
      inputVariables: [],
      outputSchema: [],
    },
  },
  position: { x: 0, y: 0 },
  inbound: [],
  outbound: [],
});

describe("Code Executor Sandbox Security", () => {
  it("rejects code using constructor keyword", async () => {
    const maliciousCode = `
      const fn = this.constructor.constructor;
      return fn ? "escaped" : "safe";
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: constructor"
    );
  });

  it("rejects code using __proto__", async () => {
    const maliciousCode = `
      const proto = input.__proto__;
      return proto;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: __proto__"
    );
  });

  it("rejects code using prototype keyword", async () => {
    const maliciousCode = `
      const proto = Object.prototype;
      return proto;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: prototype"
    );
  });

  it("rejects code using process keyword", async () => {
    const maliciousCode = `
      return process.env.SECRET;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: process"
    );
  });

  it("rejects code using global keyword", async () => {
    const maliciousCode = `
      return global.something;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: global"
    );
  });

  it("rejects code using globalThis keyword", async () => {
    const maliciousCode = `
      return globalThis.something;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: globalThis"
    );
  });

  it("rejects code using require keyword", async () => {
    const maliciousCode = `
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd');
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: require"
    );
  });

  it("rejects code using eval keyword", async () => {
    const maliciousCode = `
      return eval('1+1');
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern: eval"
    );
  });

  it("rejects code using Function constructor", async () => {
    const maliciousCode = `
      const fn = Function('return process')();
      return fn;
    `;
    const node = createNode(maliciousCode);
    await expect(codeExecutor({ node, input: {} })).rejects.toThrow(
      "forbidden pattern"
    );
  });

  it("allows safe object property access", async () => {
    const safeCode = `
      return {
        name: input.name,
        count: input.items.length,
        first: input.items[0],
      };
    `;
    const node = createNode(safeCode);
    const result = await codeExecutor({
      node,
      input: { name: "test", items: ["a", "b", "c"] },
    });
    expect(result).toEqual({ name: "test", count: 3, first: "a" });
  });

  it("allows safe array operations", async () => {
    const safeCode = `
      const doubled = input.numbers.map(n => n * 2);
      return { doubled };
    `;
    const node = createNode(safeCode);
    const result = await codeExecutor({
      node,
      input: { numbers: [1, 2, 3] },
    });
    expect(result).toEqual({ doubled: [2, 4, 6] });
  });

  it("allows safe string operations", async () => {
    const safeCode = `
      return input.text.toUpperCase().trim();
    `;
    const node = createNode(safeCode);
    const result = await codeExecutor({
      node,
      input: { text: "  hello world  " },
    });
    expect(result).toBe("HELLO WORLD");
  });

  it("allows async fetch operations", async () => {
    const safeCode = `
      // Just test that fetch is available, don't actually call it
      return typeof fetch === 'function';
    `;
    const node = createNode(safeCode);
    const result = await codeExecutor({ node, input: {} });
    expect(result).toBe(true);
  });

  it("allows console logging when enabled", async () => {
    const node = createNode(`console.log('test'); return 'done';`);
    node.data.config.enableConsole = true;
    const result = await codeExecutor({ node, input: {} });
    expect(result).toBe("done");
  });
});

import { describe, expect, it } from "bun:test";
import { workspaceRouter } from "../workspace";

describe("workspaceRouter", () => {
  const procedures = workspaceRouter._def.procedures as Record<string, unknown>;

  describe("procedure registry", () => {
    const expectedProcedures = [
      "query",
      "listObjects",
      "getObject",
      "createObject",
      "listEntries",
      "createEntry",
      "updateEntry",
      "importData",
      "nl2sql",
    ];

    for (const name of expectedProcedures) {
      it(`has "${name}" procedure`, () => {
        expect(procedures[name]).toBeDefined();
      });
    }

    it("has exactly 9 procedures", () => {
      expect(Object.keys(procedures)).toHaveLength(9);
    });
  });

  describe("procedure types", () => {
    function getProcedureType(name: string): string | undefined {
      const proc = procedures[name] as { _def?: { type?: string } } | undefined;
      return proc?._def?.type;
    }

    it("query is a query procedure", () => {
      expect(getProcedureType("query")).toBe("query");
    });

    it("listObjects is a query procedure", () => {
      expect(getProcedureType("listObjects")).toBe("query");
    });

    it("getObject is a query procedure", () => {
      expect(getProcedureType("getObject")).toBe("query");
    });

    it("listEntries is a query procedure", () => {
      expect(getProcedureType("listEntries")).toBe("query");
    });

    it("nl2sql is a query procedure", () => {
      expect(getProcedureType("nl2sql")).toBe("query");
    });

    it("createObject is a mutation procedure", () => {
      expect(getProcedureType("createObject")).toBe("mutation");
    });

    it("createEntry is a mutation procedure", () => {
      expect(getProcedureType("createEntry")).toBe("mutation");
    });

    it("updateEntry is a mutation procedure", () => {
      expect(getProcedureType("updateEntry")).toBe("mutation");
    });

    it("importData is a mutation procedure", () => {
      expect(getProcedureType("importData")).toBe("mutation");
    });
  });
});

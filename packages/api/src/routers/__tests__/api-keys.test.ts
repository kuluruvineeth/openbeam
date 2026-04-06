import { describe, expect, it } from "bun:test";
import { apiKeysRouter } from "../api-keys";

describe("apiKeysRouter", () => {
  const procedures = apiKeysRouter._def.procedures as Record<string, unknown>;

  describe("procedure registry", () => {
    const expectedProcedures = ["list", "create", "update", "revoke"];

    for (const name of expectedProcedures) {
      it(`has "${name}" procedure`, () => {
        expect(procedures[name]).toBeDefined();
      });
    }

    it("has exactly 4 procedures", () => {
      expect(Object.keys(procedures)).toHaveLength(4);
    });
  });

  describe("procedure types", () => {
    function getProcedureType(name: string): string | undefined {
      const proc = procedures[name] as { _def?: { type?: string } } | undefined;
      return proc?._def?.type;
    }

    it("list is a query procedure", () => {
      expect(getProcedureType("list")).toBe("query");
    });

    it("create is a mutation procedure", () => {
      expect(getProcedureType("create")).toBe("mutation");
    });

    it("update is a mutation procedure", () => {
      expect(getProcedureType("update")).toBe("mutation");
    });

    it("revoke is a mutation procedure", () => {
      expect(getProcedureType("revoke")).toBe("mutation");
    });
  });

  describe("input validation", () => {
    function getInputParser(name: string): {
      parse?: (input: unknown) => unknown;
    } {
      const proc = procedures[name] as
        | {
            _def?: {
              inputs?: ({ parse?: (input: unknown) => unknown } | undefined)[];
            };
          }
        | undefined;
      return proc?._def?.inputs?.[0] ?? {};
    }

    it("create rejects empty names", () => {
      const parser = getInputParser("create");
      expect(() => parser.parse?.({ name: "" })).toThrow();
    });

    it("create rejects names over 100 chars", () => {
      const parser = getInputParser("create");
      expect(() => parser.parse?.({ name: "a".repeat(101) })).toThrow();
    });

    it("create accepts minimal valid input", () => {
      const parser = getInputParser("create");
      const result = parser.parse?.({ name: "ci" }) as { name: string };
      expect(result.name).toBe("ci");
    });

    it("create accepts scopes and expiresAt", () => {
      const parser = getInputParser("create");
      const expiresAt = new Date("2026-12-31T00:00:00.000Z");
      const result = parser.parse?.({
        name: "ci",
        scopes: ["search:read"],
        expiresAt,
      }) as { name: string; scopes: string[]; expiresAt: Date };
      expect(result.name).toBe("ci");
      expect(result.scopes).toEqual(["search:read"]);
      expect(result.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it("update requires id", () => {
      const parser = getInputParser("update");
      expect(() => parser.parse?.({})).toThrow();
    });

    it("update accepts id only", () => {
      const parser = getInputParser("update");
      const result = parser.parse?.({ id: "key_1" }) as { id: string };
      expect(result.id).toBe("key_1");
    });

    it("update rejects empty names", () => {
      const parser = getInputParser("update");
      expect(() => parser.parse?.({ id: "key_1", name: "" })).toThrow();
    });

    it("update accepts name and scopes", () => {
      const parser = getInputParser("update");
      const result = parser.parse?.({
        id: "key_1",
        name: "renamed",
        scopes: ["search:read", "teams:read"],
      }) as { id: string; name: string; scopes: string[] };
      expect(result.name).toBe("renamed");
      expect(result.scopes).toHaveLength(2);
    });

    it("revoke requires id", () => {
      const parser = getInputParser("revoke");
      expect(() => parser.parse?.({})).toThrow();
    });

    it("revoke accepts valid id", () => {
      const parser = getInputParser("revoke");
      const result = parser.parse?.({ id: "key_1" }) as { id: string };
      expect(result.id).toBe("key_1");
    });
  });
});

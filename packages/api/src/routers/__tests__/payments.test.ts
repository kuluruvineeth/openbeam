import { describe, expect, it } from "bun:test";
import { paymentsRouter } from "../payments";

describe("paymentsRouter", () => {
  const procedures = paymentsRouter._def.procedures as Record<string, unknown>;

  describe("procedure registry", () => {
    const expectedProcedures = [
      "listWallets",
      "ledgerBalance",
      "summary",
      "listReceipts",
      "getReceipt",
      "pricingPolicies",
    ];

    for (const name of expectedProcedures) {
      it(`has "${name}" procedure`, () => {
        expect(procedures[name]).toBeDefined();
      });
    }

    it("has exactly 6 procedures", () => {
      expect(Object.keys(procedures)).toHaveLength(6);
    });
  });

  describe("procedure types", () => {
    function getProcedureType(name: string): string | undefined {
      const proc = procedures[name] as { _def?: { type?: string } } | undefined;
      return proc?._def?.type;
    }

    it("listWallets is a query", () => {
      expect(getProcedureType("listWallets")).toBe("query");
    });

    it("ledgerBalance is a query", () => {
      expect(getProcedureType("ledgerBalance")).toBe("query");
    });

    it("summary is a query", () => {
      expect(getProcedureType("summary")).toBe("query");
    });

    it("listReceipts is a query", () => {
      expect(getProcedureType("listReceipts")).toBe("query");
    });

    it("getReceipt is a query", () => {
      expect(getProcedureType("getReceipt")).toBe("query");
    });

    it("pricingPolicies is a query", () => {
      expect(getProcedureType("pricingPolicies")).toBe("query");
    });
  });
});

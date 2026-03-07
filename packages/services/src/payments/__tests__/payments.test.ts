import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { CreatePaymentReceiptInput } from "@openbeam/types/db";

const mockCreatePaymentReceipt = mock(() =>
  Promise.resolve({ id: "receipt_1", teamId: "team_1" })
);
const mockCreatePaymentLedgerEntry = mock(() =>
  Promise.resolve({ id: "ledger_1" })
);
const mockGetTeamLedgerBalance = mock(() => Promise.resolve(100));
const mockUpdatePaymentReceipt = mock(() =>
  Promise.resolve({ id: "receipt_1" })
);
const mockCreatePaymentWallet = mock(() => Promise.resolve({ id: "wallet_1" }));
const mockUpdatePaymentWalletStatus = mock(() =>
  Promise.resolve({ id: "wallet_1" })
);
const mockUpsertPaymentPricingPolicy = mock(() =>
  Promise.resolve({ id: "policy_1" })
);

mock.module("@openbeam/db", () => ({
  createPaymentReceipt: mockCreatePaymentReceipt,
  createPaymentLedgerEntry: mockCreatePaymentLedgerEntry,
  getTeamLedgerBalance: mockGetTeamLedgerBalance,
  updatePaymentReceipt: mockUpdatePaymentReceipt,
  createPaymentWallet: mockCreatePaymentWallet,
  updatePaymentWalletStatus: mockUpdatePaymentWalletStatus,
  upsertPaymentPricingPolicy: mockUpsertPaymentPricingPolicy,
  getTeamDefaultWallet: mock(() => Promise.resolve(null)),
  getTeamWallets: mock(() => Promise.resolve([])),
  getTeamPaymentSummary: mock(() => Promise.resolve({})),
  getActivePricingPolicies: mock(() => Promise.resolve([])),
  getPricingPolicy: mock(() => Promise.resolve(null)),
  getPaymentReceiptByRequestId: mock(() => Promise.resolve(null)),
  getPaymentReceiptByTxHash: mock(() => Promise.resolve(null)),
  listPaymentReceipts: mock(() =>
    Promise.resolve({ items: [], nextCursor: undefined, hasMore: false })
  ),
}));

mock.module("../../lib/logger", () => ({
  createServiceLogger: () => ({
    info: Function.prototype,
    warn: Function.prototype,
    error: Function.prototype,
    debug: Function.prototype,
  }),
}));

const {
  recordPayment,
  settlePayment,
  failPayment,
  registerWallet,
  suspendWallet,
  activateWallet,
  setPricingPolicy,
} = await import("../index");

const db = {} as never;

describe("Payment Service", () => {
  beforeEach(() => {
    mockCreatePaymentReceipt.mockClear();
    mockCreatePaymentLedgerEntry.mockClear();
    mockGetTeamLedgerBalance.mockClear();
    mockUpdatePaymentReceipt.mockClear();
    mockCreatePaymentWallet.mockClear();
    mockUpdatePaymentWalletStatus.mockClear();
    mockUpsertPaymentPricingPolicy.mockClear();
  });

  describe("recordPayment", () => {
    const input: CreatePaymentReceiptInput = {
      teamId: "team_1",
      requestId: "req_abc",
      payer: "0xPayer",
      payTo: "0xPayee",
      network: "eip155:84532",
      asset: "USDC",
      amount: 0.01,
      toolName: "search_hybrid",
    };

    it("creates receipt and ledger entry atomically", async () => {
      const result = await recordPayment(db, input);

      expect(result.receiptId).toBe("receipt_1");
      expect(result.ledgerEntryId).toBe("ledger_1");

      expect(mockGetTeamLedgerBalance).toHaveBeenCalledTimes(1);
      expect(mockCreatePaymentReceipt).toHaveBeenCalledTimes(1);
      expect(mockCreatePaymentLedgerEntry).toHaveBeenCalledTimes(1);
    });

    it("computes correct balanceAfter from current balance", async () => {
      mockGetTeamLedgerBalance.mockResolvedValue(50);

      await recordPayment(db, input);

      const ledgerCall = mockCreatePaymentLedgerEntry.mock.calls[0];
      expect((ledgerCall as unknown[])[1]).toMatchObject({
        balanceBefore: 50,
        balanceAfter: 50.01,
        entryType: "CREDIT",
      });
    });

    it("uses toolName in ledger description", async () => {
      await recordPayment(db, input);

      const ledgerCall = mockCreatePaymentLedgerEntry.mock.calls[0];
      expect((ledgerCall as unknown[])[1]).toMatchObject({
        description: "Payment for search_hybrid",
      });
    });

    it("uses routePath in description when no toolName", async () => {
      await recordPayment(db, {
        ...input,
        toolName: undefined,
        routePath: "/api/v1/paid/search",
      });

      const ledgerCall = mockCreatePaymentLedgerEntry.mock.calls[0];
      expect((ledgerCall as unknown[])[1]).toMatchObject({
        description: "Payment for /api/v1/paid/search",
      });
    });

    it("uses generic description when neither toolName nor routePath", async () => {
      await recordPayment(db, {
        ...input,
        toolName: undefined,
        routePath: undefined,
      });

      const ledgerCall = mockCreatePaymentLedgerEntry.mock.calls[0];
      expect((ledgerCall as unknown[])[1]).toMatchObject({
        description: "Payment received",
      });
    });
  });

  describe("settlePayment", () => {
    it("marks receipt as verified and settled with txHash", async () => {
      await settlePayment(db, "receipt_1", "0xTxHash123");

      expect(mockUpdatePaymentReceipt).toHaveBeenCalledWith(db, "receipt_1", {
        verificationResult: "VERIFIED",
        settlementResult: "SETTLED",
        txHash: "0xTxHash123",
        facilitatorResponse: undefined,
      });
    });

    it("includes facilitator response when provided", async () => {
      const facilResp = { status: "settled", id: "fac_123" };
      await settlePayment(db, "receipt_1", "0xTxHash", facilResp);

      expect(mockUpdatePaymentReceipt).toHaveBeenCalledWith(db, "receipt_1", {
        verificationResult: "VERIFIED",
        settlementResult: "SETTLED",
        txHash: "0xTxHash",
        facilitatorResponse: facilResp,
      });
    });
  });

  describe("failPayment", () => {
    it("marks receipt as failed", async () => {
      await failPayment(db, "receipt_1", "insufficient_funds");

      expect(mockUpdatePaymentReceipt).toHaveBeenCalledWith(db, "receipt_1", {
        verificationResult: "FAILED",
        settlementResult: "FAILED",
        facilitatorResponse: undefined,
      });
    });
  });

  describe("registerWallet", () => {
    it("creates wallet and returns id", async () => {
      const walletId = await registerWallet(db, {
        teamId: "team_1",
        chain: "base",
        network: "eip155:84532",
        address: "0xWallet",
        custodyMode: "SELF_CUSTODY",
      });

      expect(walletId).toBe("wallet_1");
      expect(mockCreatePaymentWallet).toHaveBeenCalledTimes(1);
    });
  });

  describe("suspendWallet / activateWallet", () => {
    it("suspends wallet", async () => {
      await suspendWallet(db, "wallet_1");
      expect(mockUpdatePaymentWalletStatus).toHaveBeenCalledWith(
        db,
        "wallet_1",
        "SUSPENDED"
      );
    });

    it("activates wallet", async () => {
      await activateWallet(db, "wallet_1");
      expect(mockUpdatePaymentWalletStatus).toHaveBeenCalledWith(
        db,
        "wallet_1",
        "ACTIVE"
      );
    });
  });

  describe("setPricingPolicy", () => {
    it("upserts pricing policy and returns id", async () => {
      const policyId = await setPricingPolicy(db, {
        teamId: "team_1",
        targetType: "TOOL",
        targetName: "search_hybrid",
        pricingMode: "STATIC",
        amount: 0.01,
        currency: "USDC",
        network: "eip155:84532",
        isActive: true,
      });

      expect(policyId).toBe("policy_1");
      expect(mockUpsertPaymentPricingPolicy).toHaveBeenCalledTimes(1);
    });
  });
});

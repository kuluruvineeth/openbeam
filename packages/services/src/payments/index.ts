import type { Database } from "@openplane/db";
import {
  createPaymentLedgerEntry,
  createPaymentReceipt,
  createPaymentWallet,
  getActivePricingPolicies,
  getPaymentReceiptByRequestId,
  getPaymentReceiptByTxHash,
  getPricingPolicy,
  getTeamDefaultWallet,
  getTeamLedgerBalance,
  getTeamPaymentSummary,
  getTeamWallets,
  listPaymentReceipts,
  updatePaymentReceipt,
  updatePaymentWalletStatus,
  upsertPaymentPricingPolicy,
} from "@openplane/db";
import type {
  CreatePaymentReceiptInput,
  CreatePaymentWalletInput,
  UpsertPaymentPricingPolicyInput,
} from "@openplane/types/db";
import { createServiceLogger } from "../lib/logger";

const log = createServiceLogger({ service: "payments" });

export async function recordPayment(
  db: Database,
  input: CreatePaymentReceiptInput
): Promise<{ receiptId: string; ledgerEntryId: string }> {
  const balance = await getTeamLedgerBalance(db, input.teamId);

  const receipt = await createPaymentReceipt(db, input);

  let description = "Payment received";
  if (input.toolName) {
    description = `Payment for ${input.toolName}`;
  } else if (input.routePath) {
    description = `Payment for ${input.routePath}`;
  }

  const ledgerEntry = await createPaymentLedgerEntry(db, {
    teamId: input.teamId,
    receiptId: receipt.id,
    entryType: "CREDIT",
    amount: input.amount,
    currency: input.asset,
    balanceBefore: balance,
    balanceAfter: balance + input.amount,
    description,
  });

  log.info(
    { teamId: input.teamId, receiptId: receipt.id, amount: input.amount },
    "Payment recorded"
  );

  return { receiptId: receipt.id, ledgerEntryId: ledgerEntry.id };
}

export async function settlePayment(
  db: Database,
  receiptId: string,
  txHash: string,
  facilitatorResponse?: unknown
): Promise<void> {
  await updatePaymentReceipt(db, receiptId, {
    verificationResult: "VERIFIED",
    settlementResult: "SETTLED",
    txHash,
    facilitatorResponse,
  });

  log.info({ receiptId, txHash }, "Payment settled");
}

export async function failPayment(
  db: Database,
  receiptId: string,
  reason: string,
  facilitatorResponse?: unknown
): Promise<void> {
  await updatePaymentReceipt(db, receiptId, {
    verificationResult: "FAILED",
    settlementResult: "FAILED",
    facilitatorResponse,
  });

  log.warn({ receiptId, reason }, "Payment failed");
}

export async function registerWallet(
  db: Database,
  input: CreatePaymentWalletInput
): Promise<string> {
  const wallet = await createPaymentWallet(db, input);
  log.info(
    { teamId: input.teamId, walletId: wallet.id, address: input.address },
    "Wallet registered"
  );
  return wallet.id;
}

export async function suspendWallet(
  db: Database,
  walletId: string
): Promise<void> {
  await updatePaymentWalletStatus(db, walletId, "SUSPENDED");
  log.info({ walletId }, "Wallet suspended");
}

export async function activateWallet(
  db: Database,
  walletId: string
): Promise<void> {
  await updatePaymentWalletStatus(db, walletId, "ACTIVE");
  log.info({ walletId }, "Wallet activated");
}

export async function setPricingPolicy(
  db: Database,
  input: UpsertPaymentPricingPolicyInput
): Promise<string> {
  const policy = await upsertPaymentPricingPolicy(db, input);
  log.info(
    {
      teamId: input.teamId,
      target: `${input.targetType}:${input.targetName}`,
      amount: input.amount,
    },
    "Pricing policy set"
  );
  return policy.id;
}

export {
  getTeamDefaultWallet,
  getTeamWallets,
  getTeamPaymentSummary,
  getTeamLedgerBalance,
  getActivePricingPolicies,
  getPricingPolicy,
  getPaymentReceiptByRequestId,
  getPaymentReceiptByTxHash,
  listPaymentReceipts,
};

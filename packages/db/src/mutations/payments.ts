import type {
  CreatePaymentAttemptInput,
  CreatePaymentLedgerEntryInput,
  CreatePaymentReceiptInput,
  CreatePaymentWalletInput,
  UpdatePaymentReceiptInput,
  UpsertPaymentPricingPolicyInput,
} from "@openplane/types/db";
import type {
  PaymentAttempt,
  PaymentLedgerEntry,
  PaymentPricingPolicy,
  PaymentReceipt,
  PaymentWallet,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export async function createPaymentWallet(
  db: Database,
  data: CreatePaymentWalletInput
): Promise<PaymentWallet> {
  return await db.paymentWallet.create({
    data: {
      teamId: data.teamId,
      chain: data.chain,
      network: data.network,
      address: data.address,
      custodyMode: data.custodyMode,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function updatePaymentWalletStatus(
  db: Database,
  walletId: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<PaymentWallet> {
  return await db.paymentWallet.update({
    where: { id: walletId },
    data: { status },
  });
}

export async function upsertPaymentPricingPolicy(
  db: Database,
  data: UpsertPaymentPricingPolicyInput
): Promise<PaymentPricingPolicy> {
  return await db.paymentPricingPolicy.upsert({
    where: {
      teamId_targetType_targetName: {
        teamId: data.teamId,
        targetType: data.targetType,
        targetName: data.targetName,
      },
    },
    create: {
      teamId: data.teamId,
      targetType: data.targetType,
      targetName: data.targetName,
      pricingMode: data.pricingMode,
      amount: data.amount,
      currency: data.currency,
      network: data.network,
      description: data.description,
      isActive: data.isActive,
    },
    update: {
      pricingMode: data.pricingMode,
      amount: data.amount,
      currency: data.currency,
      network: data.network,
      description: data.description,
      isActive: data.isActive,
    },
  });
}

export async function createPaymentReceipt(
  db: Database,
  data: CreatePaymentReceiptInput
): Promise<PaymentReceipt> {
  return await db.paymentReceipt.create({
    data: {
      teamId: data.teamId,
      requestId: data.requestId,
      payer: data.payer,
      payTo: data.payTo,
      network: data.network,
      asset: data.asset,
      amount: data.amount,
      verificationResult: data.verificationResult,
      settlementResult: data.settlementResult,
      txHash: data.txHash,
      facilitatorResponse: data.facilitatorResponse as Prisma.InputJsonValue,
      correlationId: data.correlationId,
      toolName: data.toolName,
      routePath: data.routePath,
    },
  });
}

export async function updatePaymentReceipt(
  db: Database,
  receiptId: string,
  data: UpdatePaymentReceiptInput
): Promise<PaymentReceipt> {
  return await db.paymentReceipt.update({
    where: { id: receiptId },
    data: {
      verificationResult: data.verificationResult,
      settlementResult: data.settlementResult,
      txHash: data.txHash,
      facilitatorResponse: data.facilitatorResponse as Prisma.InputJsonValue,
    },
  });
}

export async function createPaymentLedgerEntry(
  db: Database,
  data: CreatePaymentLedgerEntryInput
): Promise<PaymentLedgerEntry> {
  return await db.paymentLedgerEntry.create({
    data: {
      teamId: data.teamId,
      receiptId: data.receiptId,
      entryType: data.entryType,
      amount: data.amount,
      currency: data.currency,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      description: data.description,
      metadata: data.metadata as Prisma.InputJsonValue,
    },
  });
}

export async function createPaymentAttempt(
  db: Database,
  data: CreatePaymentAttemptInput
): Promise<PaymentAttempt> {
  return await db.paymentAttempt.create({
    data: {
      receiptId: data.receiptId,
      attemptNumber: data.attemptNumber,
      status: data.status,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      facilitatorPayload: data.facilitatorPayload as Prisma.InputJsonValue,
    },
  });
}

export async function updatePaymentAttemptStatus(
  db: Database,
  attemptId: string,
  status: "PENDING" | "SUCCESS" | "FAILED",
  error?: { code: string; message: string }
): Promise<PaymentAttempt> {
  return await db.paymentAttempt.update({
    where: { id: attemptId },
    data: {
      status,
      errorCode: error?.code,
      errorMessage: error?.message,
    },
  });
}

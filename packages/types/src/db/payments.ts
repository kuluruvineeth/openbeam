import { z } from "zod";

export const CreatePaymentWalletInputSchema = z.object({
  teamId: z.string(),
  chain: z.string(),
  network: z.string(),
  address: z.string(),
  custodyMode: z.enum(["SELF_CUSTODY", "MANAGED"]),
  isDefault: z.boolean().optional(),
});

export type CreatePaymentWalletInput = z.infer<
  typeof CreatePaymentWalletInputSchema
>;

export const UpsertPaymentPricingPolicyInputSchema = z.object({
  teamId: z.string(),
  targetType: z.enum(["ROUTE", "TOOL"]),
  targetName: z.string(),
  pricingMode: z.enum(["STATIC", "DYNAMIC"]),
  amount: z.number(),
  currency: z.string().default("USDC"),
  network: z.string().default("eip155:84532"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type UpsertPaymentPricingPolicyInput = z.infer<
  typeof UpsertPaymentPricingPolicyInputSchema
>;

export const CreatePaymentReceiptInputSchema = z.object({
  teamId: z.string(),
  requestId: z.string(),
  payer: z.string(),
  payTo: z.string(),
  network: z.string(),
  asset: z.string(),
  amount: z.number(),
  verificationResult: z.enum(["VERIFIED", "FAILED", "PENDING"]).optional(),
  settlementResult: z.enum(["SETTLED", "FAILED", "PENDING"]).optional(),
  txHash: z.string().optional(),
  facilitatorResponse: z.unknown().optional(),
  correlationId: z.string().optional(),
  toolName: z.string().optional(),
  routePath: z.string().optional(),
});

export type CreatePaymentReceiptInput = z.infer<
  typeof CreatePaymentReceiptInputSchema
>;

export const UpdatePaymentReceiptInputSchema = z.object({
  verificationResult: z.enum(["VERIFIED", "FAILED", "PENDING"]).optional(),
  settlementResult: z.enum(["SETTLED", "FAILED", "PENDING"]).optional(),
  txHash: z.string().optional(),
  facilitatorResponse: z.unknown().optional(),
});

export type UpdatePaymentReceiptInput = z.infer<
  typeof UpdatePaymentReceiptInputSchema
>;

export const CreatePaymentLedgerEntryInputSchema = z.object({
  teamId: z.string(),
  receiptId: z.string(),
  entryType: z.enum(["CREDIT", "DEBIT", "REFUND", "FEE"]),
  amount: z.number(),
  currency: z.string(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePaymentLedgerEntryInput = z.infer<
  typeof CreatePaymentLedgerEntryInputSchema
>;

export const CreatePaymentAttemptInputSchema = z.object({
  receiptId: z.string(),
  attemptNumber: z.number(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  facilitatorPayload: z.unknown().optional(),
});

export type CreatePaymentAttemptInput = z.infer<
  typeof CreatePaymentAttemptInputSchema
>;

export const PaymentSummarySchema = z.object({
  totalReceipts: z.number(),
  totalAmountUsd: z.number(),
  verifiedCount: z.number(),
  failedCount: z.number(),
  pendingCount: z.number(),
});

export type PaymentSummary = z.infer<typeof PaymentSummarySchema>;

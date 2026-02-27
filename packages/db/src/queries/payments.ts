import type {
  PaymentPricingPolicy,
  PaymentReceipt,
  PaymentWallet,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export async function getTeamDefaultWallet(
  db: Database,
  teamId: string
): Promise<PaymentWallet | null> {
  return await db.paymentWallet.findFirst({
    where: { teamId, isDefault: true, status: "ACTIVE" },
  });
}

export async function getTeamWallets(
  db: Database,
  teamId: string
): Promise<PaymentWallet[]> {
  return await db.paymentWallet.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPaymentReceiptByRequestId(
  db: Database,
  requestId: string
): Promise<PaymentReceipt | null> {
  return await db.paymentReceipt.findUnique({
    where: { requestId },
    include: { ledgerEntries: true, attempts: true },
  });
}

export async function getPaymentReceiptByTxHash(
  db: Database,
  txHash: string
): Promise<PaymentReceipt | null> {
  return await db.paymentReceipt.findFirst({
    where: { txHash },
    include: { ledgerEntries: true, attempts: true },
  });
}

export async function listPaymentReceipts(
  db: Database,
  params: {
    teamId: string;
    cursor?: string;
    limit?: number;
    toolName?: string;
  }
): Promise<{
  items: PaymentReceipt[];
  nextCursor: string | undefined;
  hasMore: boolean;
}> {
  const limit = params.limit ?? 20;

  const receipts = await db.paymentReceipt.findMany({
    where: {
      teamId: params.teamId,
      toolName: params.toolName,
    },
    take: limit + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: { attempts: true },
  });

  const hasMore = receipts.length > limit;
  const items = hasMore ? receipts.slice(0, -1) : receipts;
  const nextCursor = hasMore ? items.at(-1)?.id : undefined;

  return { items, nextCursor, hasMore };
}

export async function getTeamPaymentSummary(
  db: Database,
  teamId: string,
  since?: Date
): Promise<{
  totalReceipts: number;
  totalAmountUsd: number;
  verifiedCount: number;
  failedCount: number;
  pendingCount: number;
}> {
  const where = {
    teamId,
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const [aggregate, verified, failed, pending] = await Promise.all([
    db.paymentReceipt.aggregate({
      where,
      _count: true,
      _sum: { amount: true },
    }),
    db.paymentReceipt.count({
      where: { ...where, verificationResult: "VERIFIED" },
    }),
    db.paymentReceipt.count({
      where: { ...where, verificationResult: "FAILED" },
    }),
    db.paymentReceipt.count({
      where: { ...where, verificationResult: "PENDING" },
    }),
  ]);

  return {
    totalReceipts: aggregate._count,
    totalAmountUsd: aggregate._sum.amount ?? 0,
    verifiedCount: verified,
    failedCount: failed,
    pendingCount: pending,
  };
}

export async function getActivePricingPolicies(
  db: Database,
  teamId: string
): Promise<PaymentPricingPolicy[]> {
  return await db.paymentPricingPolicy.findMany({
    where: { teamId, isActive: true },
    orderBy: { targetName: "asc" },
  });
}

export async function getPricingPolicy(
  db: Database,
  teamId: string,
  targetType: "ROUTE" | "TOOL",
  targetName: string
): Promise<PaymentPricingPolicy | null> {
  return await db.paymentPricingPolicy.findUnique({
    where: {
      teamId_targetType_targetName: {
        teamId,
        targetType,
        targetName,
      },
    },
  });
}

export async function getTeamLedgerBalance(
  db: Database,
  teamId: string
): Promise<number> {
  const lastEntry = await db.paymentLedgerEntry.findFirst({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });
  return lastEntry?.balanceAfter ?? 0;
}

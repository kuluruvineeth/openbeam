import {
  getActivePricingPolicies,
  getPaymentReceiptByRequestId,
  getTeamLedgerBalance,
  getTeamPaymentSummary,
  getTeamWallets,
  listPaymentReceipts,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const ListReceiptsInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  toolName: z.string().optional(),
});

const SummarySinceSchema = z.object({
  since: z.iso.datetime().optional(),
});

export const paymentsRouter = createTRPCRouter({
  listWallets: withActiveTeam.query(async ({ ctx }) =>
    getTeamWallets(ctx.prisma, ctx.teamId)
  ),

  ledgerBalance: withActiveTeam.query(async ({ ctx }) => {
    const balance = await getTeamLedgerBalance(ctx.prisma, ctx.teamId);
    return { balance };
  }),

  summary: withActiveTeam.input(SummarySinceSchema).query(({ ctx, input }) => {
    const since = input.since ? new Date(input.since) : undefined;
    return getTeamPaymentSummary(ctx.prisma, ctx.teamId, since);
  }),

  listReceipts: withActiveTeam
    .input(ListReceiptsInputSchema)
    .query(async ({ ctx, input }) =>
      listPaymentReceipts(ctx.prisma, {
        teamId: ctx.teamId,
        cursor: input.cursor,
        limit: input.limit,
        toolName: input.toolName,
      })
    ),

  getReceipt: withActiveTeam
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const receipt = await getPaymentReceiptByRequestId(
        ctx.prisma,
        input.requestId
      );

      if (!receipt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receipt not found",
        });
      }

      if (receipt.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return receipt;
    }),

  pricingPolicies: withActiveTeam.query(async ({ ctx }) =>
    getActivePricingPolicies(ctx.prisma, ctx.teamId)
  ),
});

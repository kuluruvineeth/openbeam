import { type SearchRanking, searchService } from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const searchInputSchema = z.object({
  q: z.string().default(""),
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceTypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  connectorId: z.string().optional(),
  authorId: z.string().optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid"),
});

const autocompleteInputSchema = z.object({
  prefix: z.string().min(2),
  limit: z.number().min(1).max(50).default(10),
});

const recentInputSchema = z.object({
  hours: z.number().min(1).max(168).default(24),
  limit: z.number().min(1).max(100).default(20),
});

export const searchRouter = createTRPCRouter({
  query: withActiveTeam
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;

      const result = await searchService.search({
        query: input.q,
        teamId: ctx.teamId,
        connectorTypes: input.connectorTypes,
        documentTypes: input.documentTypes,
        sourceTypes: input.sourceTypes,
        statuses: input.statuses,
        priorities: input.priorities,
        labels: input.labels,
        connectorId: input.connectorId,
        authorId: input.authorId,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as SearchRanking,
        accessControlIds: undefined,
      });

      const nextCursor = result.hasMore
        ? result.offset + result.limit
        : undefined;

      return {
        documents: result.documents,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
        nextCursor,
        queryTime: result.queryTime,
        query: input.q,
        ranking: input.ranking,
      };
    }),

  autocomplete: withActiveTeam
    .input(autocompleteInputSchema)
    .query(async ({ ctx, input }) => {
      const suggestions = await searchService.autocomplete({
        prefix: input.prefix,
        teamId: ctx.teamId,
        limit: input.limit,
        accessControlIds: undefined,
      });

      return {
        suggestions: suggestions.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          documentType: s.documentType,
          connectorType: s.connectorType,
          sourceName: s.sourceName,
        })),
      };
    }),

  recent: withActiveTeam
    .input(recentInputSchema)
    .query(async ({ ctx, input }) => {
      const documents = await searchService.getRecentDocuments({
        teamId: ctx.teamId,
        hours: input.hours,
        limit: input.limit,
        accessControlIds: undefined,
      });

      return {
        documents,
        count: documents.length,
      };
    }),
});

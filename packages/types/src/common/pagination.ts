import { z } from "zod";

export const PaginationParamsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const CursorPaginationParamsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type CursorPaginationParams = z.infer<
  typeof CursorPaginationParamsSchema
>;

export interface PageInfo {
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

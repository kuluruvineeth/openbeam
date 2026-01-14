import { z } from "zod";
import { SearchFiltersSchema } from "../search/params";

export const SavedSearchFiltersSchema = SearchFiltersSchema.extend({
  connectorIds: z.array(z.string()).optional(),
  accessControlIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
}).passthrough();

export type SavedSearchFilters = z.infer<typeof SavedSearchFiltersSchema>;

export const CreateSavedSearchInputSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(255),
  query: z.string().min(1),
  filters: SavedSearchFiltersSchema.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  isPinned: z.boolean().optional(),
});

export type CreateSavedSearchInput = z.infer<
  typeof CreateSavedSearchInputSchema
>;

export const UpdateSavedSearchInputSchema = CreateSavedSearchInputSchema.omit({
  teamId: true,
  userId: true,
}).partial();

export type UpdateSavedSearchInput = z.infer<
  typeof UpdateSavedSearchInputSchema
>;

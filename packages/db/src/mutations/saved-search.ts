import type {
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from "@openbeam/types";
import type { Prisma, SavedSearch } from "../../prisma/generated/client";
import type { Database } from "../index";

export type { CreateSavedSearchInput, UpdateSavedSearchInput };

export async function createSavedSearch(
  db: Database,
  data: CreateSavedSearchInput
): Promise<SavedSearch> {
  return await db.savedSearch.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      name: data.name,
      query: data.query,
      filters: (data.filters ?? {}) as Prisma.InputJsonValue,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
      isPinned: data.isPinned ?? false,
    },
  });
}

export async function updateSavedSearch(
  db: Database,
  id: string,
  data: UpdateSavedSearchInput
): Promise<SavedSearch> {
  return await db.savedSearch.update({
    where: { id },
    data: {
      name: data.name,
      query: data.query,
      filters: data.filters as Prisma.InputJsonValue | undefined,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
      isPinned: data.isPinned,
    },
  });
}

export async function deleteSavedSearch(
  db: Database,
  id: string
): Promise<SavedSearch> {
  return await db.savedSearch.delete({
    where: { id },
  });
}

export async function incrementSavedSearchUsage(
  db: Database,
  id: string
): Promise<SavedSearch> {
  return await db.savedSearch.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function toggleSavedSearchPin(
  db: Database,
  id: string,
  isPinned: boolean
): Promise<SavedSearch> {
  return await db.savedSearch.update({
    where: { id },
    data: { isPinned },
  });
}

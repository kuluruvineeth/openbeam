import type { SavedSearch } from "../../prisma/generated/client";
import type { Database } from "../index";

export async function findSavedSearchById(
  db: Database,
  id: string
): Promise<SavedSearch | null> {
  return await db.savedSearch.findUnique({
    where: { id },
  });
}

export async function findSavedSearchesByUser(
  db: Database,
  teamId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    pinnedFirst?: boolean;
  }
): Promise<SavedSearch[]> {
  const orderBy = options?.pinnedFirst
    ? [{ isPinned: "desc" as const }, { lastUsedAt: "desc" as const }]
    : [{ lastUsedAt: "desc" as const }];

  return await db.savedSearch.findMany({
    where: { teamId, userId },
    orderBy,
    take: options?.limit,
    skip: options?.offset,
  });
}

export async function countSavedSearchesByUser(
  db: Database,
  teamId: string,
  userId: string
): Promise<number> {
  return await db.savedSearch.count({
    where: { teamId, userId },
  });
}

export async function findSavedSearchByName(
  db: Database,
  teamId: string,
  userId: string,
  name: string
): Promise<SavedSearch | null> {
  return await db.savedSearch.findUnique({
    where: {
      teamId_userId_name: { teamId, userId, name },
    },
  });
}

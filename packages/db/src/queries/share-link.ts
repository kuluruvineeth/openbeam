import type { ShareLink } from "../../prisma/generated/client";
import type { Database } from "../index";

export async function findShareLinkById(
  db: Database,
  id: string
): Promise<ShareLink | null> {
  return await db.shareLink.findUnique({
    where: { id },
  });
}

export async function findActiveShareLink(
  db: Database,
  id: string
): Promise<ShareLink | null> {
  const shareLink = await db.shareLink.findUnique({
    where: { id },
  });

  if (!shareLink?.isActive) {
    return null;
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return null;
  }

  if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
    return null;
  }

  return shareLink;
}

export async function findShareLinksByDocument(
  db: Database,
  documentId: string,
  options?: {
    activeOnly?: boolean;
  }
): Promise<ShareLink[]> {
  return await db.shareLink.findMany({
    where: {
      documentId,
      isActive: options?.activeOnly ? true : undefined,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findShareLinksByUser(
  db: Database,
  teamId: string,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  }
): Promise<ShareLink[]> {
  return await db.shareLink.findMany({
    where: {
      teamId,
      userId,
      isActive: options?.activeOnly ? true : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit,
    skip: options?.offset,
  });
}

export async function countActiveShareLinks(
  db: Database,
  teamId: string
): Promise<number> {
  return await db.shareLink.count({
    where: {
      teamId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
}

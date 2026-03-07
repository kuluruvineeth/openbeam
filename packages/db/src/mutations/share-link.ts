import type {
  CreateShareLinkInput,
  UpdateShareLinkInput,
} from "@openbeam/types";
import type { ShareLink } from "../../prisma/generated/client";
import type { Database } from "../index";

export type { CreateShareLinkInput, UpdateShareLinkInput };

export async function createShareLink(
  db: Database,
  data: CreateShareLinkInput
): Promise<ShareLink> {
  return await db.shareLink.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      documentId: data.documentId,
      accessType: data.accessType ?? "view",
      expiresAt: data.expiresAt,
      maxViews: data.maxViews,
      password: data.password,
    },
  });
}

export async function revokeShareLink(
  db: Database,
  id: string,
  revokedBy: string
): Promise<ShareLink> {
  return await db.shareLink.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    },
  });
}

export async function incrementShareLinkViews(
  db: Database,
  id: string
): Promise<ShareLink> {
  return await db.shareLink.update({
    where: { id },
    data: {
      viewCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });
}

export async function deleteShareLink(
  db: Database,
  id: string
): Promise<ShareLink> {
  return await db.shareLink.delete({
    where: { id },
  });
}

export async function deleteShareLinksForDocument(
  db: Database,
  documentId: string
): Promise<{ count: number }> {
  return await db.shareLink.deleteMany({
    where: { documentId },
  });
}

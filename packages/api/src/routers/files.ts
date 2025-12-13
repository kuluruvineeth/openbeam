import { getStorageProvider } from "@openplane/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const CUID_LENGTH = 25;

function parseDocumentId(documentId: string) {
  const prefixes = ["chunk-", "file-", "video_", "media_"] as const;
  const prefix = prefixes.find((p) => documentId.startsWith(p));

  if (!prefix) {
    return { type: "unknown" as const };
  }

  const rest = documentId.slice(prefix.length);
  const connectorId = rest.slice(0, CUID_LENGTH);
  const afterConnector = rest.slice(CUID_LENGTH + 1);

  if (prefix === "chunk-") {
    const lastDash = afterConnector.lastIndexOf("-");
    return {
      type: "file" as const,
      connectorId,
      externalId:
        lastDash > 0 ? afterConnector.slice(0, lastDash) : afterConnector,
    };
  }

  if (prefix === "video_" || prefix === "media_") {
    return {
      type: "media" as const,
      connectorId,
      externalId: afterConnector,
    };
  }

  return { type: "file" as const, connectorId, externalId: afterConnector };
}

const fileInclude = {
  connector: { select: { teamId: true } },
} as const;

export const filesRouter = createTRPCRouter({
  getPreviewUrl: withActiveTeam
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parsed = parseDocumentId(input.documentId);
      const isMediaPrefix =
        input.documentId.startsWith("video_") ||
        input.documentId.startsWith("media_");

      if (parsed.type === "media" || isMediaPrefix) {
        return await getMediaPreview(ctx, input.documentId, parsed);
      }

      if (parsed.type === "unknown") {
        const media = await ctx.prisma.indexedMedia.findUnique({
          where: { id: input.documentId },
          select: { id: true },
        });
        if (media) {
          return await getMediaPreview(ctx, input.documentId, parsed);
        }
      }

      return await getFilePreview(ctx, input.documentId, parsed);
    }),
});

async function getFilePreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const { connectorId, externalId } = parsed;

  const file =
    (connectorId &&
      externalId &&
      (await ctx.prisma.indexedFile.findFirst({
        where: { connectorId, externalId },
        include: fileInclude,
      }))) ||
    (await ctx.prisma.indexedFile.findUnique({
      where: { vespaId: documentId },
      include: fileInclude,
    })) ||
    (await ctx.prisma.indexedFile.findUnique({
      where: { id: documentId },
      include: fileInclude,
    }));

  if (!file) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }

  if (file.connector.teamId !== ctx.teamId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  const url = await getStorageProvider().getSignedUrl(file.storageKey, 3600);

  return {
    url,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    pageCount: file.pageCount,
    isVideo: false as const,
  };
}

async function getMediaPreview(
  ctx: { prisma: typeof import("@openplane/db").default; teamId: string },
  documentId: string,
  parsed: { connectorId?: string; externalId?: string }
) {
  const { connectorId, externalId } = parsed;

  const media =
    (connectorId &&
      externalId &&
      (await ctx.prisma.indexedMedia.findFirst({
        where: { connectorId, externalId },
        include: fileInclude,
      }))) ||
    (await ctx.prisma.indexedMedia.findUnique({
      where: { vespaId: documentId },
      include: fileInclude,
    })) ||
    (await ctx.prisma.indexedMedia.findUnique({
      where: { id: documentId },
      include: fileInclude,
    }));

  if (!media) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });
  }

  if (media.connector.teamId !== ctx.teamId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  const url = await getStorageProvider().getSignedUrl(media.storageKey, 3600);

  return {
    url,
    fileName: media.fileName,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    pageCount: null,
    isMedia: true as const,
    mediaType: media.mediaType,
    assetId: media.twelveLabsAssetId,
    indexId: media.twelveLabsIndexId,
    vespaId: media.vespaId,
    videoId: media.id,
    twelveLabsAssetId: media.twelveLabsAssetId,
  };
}
